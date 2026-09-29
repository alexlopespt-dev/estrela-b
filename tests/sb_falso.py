"""Supabase simulada para os testes da versão para clubes (Auth, REST das tabelas usadas pela app, Storage).
Liga-se ao Playwright com page.route("https://sb.teste/**", SB.handle). As regras de acesso verdadeiras (RLS) são
testadas à parte em supabase/tests (Postgres); aqui imita-se o essencial: só membros veem a equipa, 'leitura' não grava,
adjunto/analista não alteram a configuração (meta), convites por email, versão (v) a subir a cada gravação."""
import json, uuid, time, re
from urllib.parse import urlparse, parse_qs, unquote

ROLES_W = {"admin": "*", "principal": "*", "adjunto": "-meta", "analista": "-meta-injuries", "fisio": "injuries",
           "fisico": "tests events", "manager": "events players staff", "leitura": ""}

def can_write(role, col):
    r = ROLES_W.get(role, "")
    if r == "*": return True
    if r.startswith("-"): return col not in r.split("-")
    return col in r.split()

class SbFalso:
    def __init__(self, confirm=False):
        self.confirm = confirm          # True: o registo pede confirmação por email (como na Supabase por omissão)
        self.users = {}; self.tokens = {}; self.refresh = {}
        self.clubs = {}; self.teams = {}; self.members = []; self.invites = []
        self.docs = {}; self.v = 0; self.files = {}; self.log = []
        self.expire_all = False

    # ---------- auxiliares
    def _session(self, u):
        a, r = "at-" + uuid.uuid4().hex, "rt-" + uuid.uuid4().hex
        self.tokens[a] = u["id"]; self.refresh[r] = u["id"]
        return {"access_token": a, "refresh_token": r, "token_type": "bearer", "expires_in": 3600,
                "expires_at": int(time.time()) + 3600, "user": self._user(u)}
    def _user(self, u): return {"id": u["id"], "email": u["email"], "user_metadata": u["meta"]}
    def _me(self, req):
        a = (req.headers.get("authorization") or "").replace("Bearer ", "")
        if self.expire_all: return None
        uid = self.tokens.get(a)
        return next((u for u in self.users.values() if u["id"] == uid), None)
    def _role(self, uid, team):
        m = next((m for m in self.members if m["user_id"] == uid and m["team_id"] == team), None)
        return m and m["role"]
    def confirm_link(self, email):
        """o link do email de confirmação: devolve o fragmento #access_token=... que a Supabase põe no endereço"""
        u = self.users[email.lower()]; u["confirmed"] = True; s = self._session(u)
        return f"#access_token={s['access_token']}&expires_at={s['expires_at']}&expires_in=3600&refresh_token={s['refresh_token']}&token_type=bearer&type=signup"

    def handle(self, route, request):
        try:
            st, body, ctype = self._handle(request)
        except Exception as e:  # erro no simulador = teste falha de forma visível
            st, body, ctype = 500, {"message": "simulador: " + repr(e)}, "application/json"
        self.log.append((request.method, request.url, st))
        if isinstance(body, (bytes, bytearray)):
            route.fulfill(status=st, body=body, headers={"Content-Type": ctype, "Access-Control-Allow-Origin": "*"})
        else:
            route.fulfill(status=st, body="" if body is None else json.dumps(body), headers={"Content-Type": ctype, "Access-Control-Allow-Origin": "*"})

    def _handle(self, req):
        J = "application/json"
        if req.method == "OPTIONS": return 200, None, J
        if req.headers.get("apikey") != "sb_publishable_fcmL5GtbiMxlSuWhsqogeg_1BxFZ-4J": return 401, {"message": "No API key found in request"}, J
        u = urlparse(req.url); p = u.path; q = parse_qs(u.query)
        body = None
        if req.method in ("POST", "PUT", "PATCH") and not p.startswith("/storage/"):
            body = json.loads(req.post_data or "null")
        # ---------------- Auth
        if p == "/auth/v1/signup":
            e = body["email"].lower()
            if e in self.users: return 422, {"code": 422, "error_code": "user_already_exists", "msg": "User already registered"}, J
            if len(body["password"]) < 8: return 422, {"error_code": "weak_password", "msg": "Password should be at least 8 characters."}, J
            usr = {"id": str(uuid.uuid4()), "email": e, "pw": body["password"], "meta": body.get("data") or {}, "confirmed": not self.confirm}
            self.users[e] = usr
            return 200, (self._user(usr) if self.confirm else self._session(usr)), J
        if p == "/auth/v1/token":
            if q.get("grant_type") == ["password"]:
                usr = self.users.get(body["email"].lower())
                if not usr or usr["pw"] != body["password"]: return 400, {"error": "invalid_grant", "error_description": "Invalid login credentials"}, J
                if not usr["confirmed"]: return 400, {"error_code": "email_not_confirmed", "msg": "Email not confirmed"}, J
                return 200, self._session(usr), J
            uid = self.refresh.pop(body.get("refresh_token"), None)
            usr = next((x for x in self.users.values() if x["id"] == uid), None)
            if not usr: return 400, {"error_description": "Invalid Refresh Token: Refresh Token Not Found"}, J
            self.expire_all = False
            return 200, self._session(usr), J
        if p == "/auth/v1/recover": return 200, {}, J
        me = self._me(req)
        if p == "/auth/v1/logout": return 204, None, J
        if not me: return 401, {"code": "PGRST301", "message": "JWT expired"}, J
        if p == "/auth/v1/user":
            if req.method == "PUT": me["pw"] = body["password"]
            return 200, self._user(me), J
        # ---------------- RPC
        if p == "/rest/v1/rpc/create_club":
            c, t = str(uuid.uuid4()), str(uuid.uuid4())
            self.clubs[c] = {"id": c, "name": body["p_name"].strip()}
            self.teams[t] = {"id": t, "club_id": c, "name": body["p_team"].strip(), "season": body.get("p_season"), "comp": body.get("p_comp")}
            self._add_member(t, me, "admin")
            return 200, t, J
        if p == "/rest/v1/rpc/accept_invite":
            i = next((i for i in self.invites if i["token"] == body["p_token"]), None)
            if not i: return 400, {"code": "P0001", "message": "Convite inválido"}, J
            if i["accepted_at"]: return 400, {"code": "P0001", "message": "Este convite já foi usado"}, J
            if i["email"] != me["email"]: return 400, {"code": "P0001", "message": "Este convite é para outro email"}, J
            self.members = [m for m in self.members if not (m["team_id"] == i["team_id"] and m["user_id"] == me["id"])]
            self._add_member(i["team_id"], me, i["role"]); i["accepted_at"] = time.time()
            return 200, i["team_id"], J
        if p == "/rest/v1/rpc/set_my_name":
            for m in self.members:
                if m["user_id"] == me["id"]: m["display_name"] = body["p_name"].strip()
            return 204, None, J
        # ---------------- tabelas
        f = {k: v[0] for k, v in q.items()}
        eq = lambda k: unquote(f[k][3:]) if f.get(k, "").startswith("eq.") else None
        if p == "/rest/v1/members":
            if req.method == "GET":
                if eq("user_id"):
                    out = []
                    for m in self.members:
                        if m["user_id"] != eq("user_id"): continue
                        t = self.teams[m["team_id"]]
                        out.append({**m, "teams": {**t, "clubs": {"name": self.clubs[t["club_id"]]["name"]}}})
                    return 200, out, J
                t = eq("team_id")
                if not self._role(me["id"], t): return 200, [], J
                return 200, [m for m in self.members if m["team_id"] == t], J
            t, uid = eq("team_id"), eq("user_id")
            if self._role(me["id"], t) != "admin" and not (req.method == "DELETE" and uid == me["id"]): return 200, [], J
            if req.method == "PATCH":
                for m in self.members:
                    if m["team_id"] == t and m["user_id"] == uid: m["role"] = body["role"]
                return 204, None, J
            admins = [m for m in self.members if m["team_id"] == t and m["role"] == "admin" and m["user_id"] != uid]
            if not admins: return 400, {"message": "A equipa não pode ficar sem administrador"}, J
            self.members = [m for m in self.members if not (m["team_id"] == t and m["user_id"] == uid)]
            return 204, None, J
        if p == "/rest/v1/invites":
            if req.method == "POST":
                if self._role(me["id"], body["team_id"]) != "admin": return 403, {"code": "42501", "message": 'new row violates row-level security policy for table "invites"'}, J
                i = {"id": str(uuid.uuid4()), "team_id": body["team_id"], "email": body["email"].lower(), "role": body["role"], "token": str(uuid.uuid4()),
                     "expires_at": "2099-01-01T00:00:00+00:00", "accepted_at": None}
                self.invites.append(i); return 201, [i], J
            if req.method == "DELETE":
                self.invites = [i for i in self.invites if i["id"] != eq("id") or self._role(me["id"], i["team_id"]) != "admin"]; return 204, None, J
            t = eq("team_id")
            if self._role(me["id"], t) != "admin": return 200, [], J
            return 200, [i for i in self.invites if i["team_id"] == t and not i["accepted_at"]], J
        if p == "/rest/v1/docs":
            if req.method == "GET":
                t = eq("team_id")
                if not self._role(me["id"], t): return 200, [], J
                rows = [{"col": c, "id": i, "data": d["data"], "v": d["v"], "deleted": d["deleted"]} for (tt, c, i), d in self.docs.items() if tt == t]
                if f.get("deleted") == "is.false": rows = [r for r in rows if not r["deleted"]]
                if f.get("v", "").startswith("gt."): rows = [r for r in rows if r["v"] > int(f["v"][3:])]
                rows.sort(key=lambda r: r["v"]); off, lim = int(f.get("offset", 0)), int(f.get("limit", 100000))
                return 200, rows[off:off + lim], J
            if req.method == "POST":
                items = body if isinstance(body, list) else [body]
                for it in items:
                    if not can_write(self._role(me["id"], it["team_id"]), it["col"]):
                        return 403, {"code": "42501", "message": 'new row violates row-level security policy for table "docs"'}, J
                for it in items:
                    self.v += 1
                    self.docs[(it["team_id"], it["col"], it["id"])] = {"data": it["data"], "v": self.v, "deleted": bool(it.get("deleted")), "by": me["id"]}
                return 201, None, J
            if req.method == "PATCH":
                t, c, i = eq("team_id"), eq("col"), eq("id"); d = self.docs.get((t, c, i))
                if not d or not can_write(self._role(me["id"], t), c): return 200, [], J
                self.v += 1; d.update(body); d["v"] = self.v
                return 200, [{"col": c, "id": i, **d}], J
        # ---------------- ficheiros
        m = re.match(r"^/storage/v1/object/(authenticated/)?equipa/(.+)$", p)
        if m:
            path = m.group(2); team = path.split("/")[0]
            if not self._role(me["id"], team): return 403, {"message": "new row violates row-level security policy"}, J
            if req.method == "POST":
                self.files[path] = (req.post_data_buffer, req.headers.get("content-type", "application/octet-stream"))
                return 200, {"Key": "equipa/" + path}, J
            if path not in self.files: return 404, {"message": "Object not found"}, J
            data, ct = self.files[path]; return 200, data, ct
        return 404, {"message": "simulador: rota desconhecida " + req.method + " " + p}, J

    def _add_member(self, team, usr, role):
        self.members.append({"team_id": team, "user_id": usr["id"], "role": role, "email": usr["email"],
                             "display_name": (usr["meta"] or {}).get("name"), "created_at": time.time()})
