const React=require('react'), {renderToStaticMarkup}=require('react-dom/server'), sharp=require('sharp'), fs=require('fs');
const fa=require('react-icons/fa'), gi=require('react-icons/gi'), md=require('react-icons/md');
const want={whistle:[gi,'GiWhistle'],ball:[gi,'GiSoccerBall'],field:[gi,'GiSoccerField'],kick:[gi,'GiSoccerKick'],clip:[fa,'FaClipboardList'],cal:[fa,'FaCalendarAlt'],chart:[fa,'FaChartBar'],
 heart:[fa,'FaHeartbeat'],users:[fa,'FaUsers'],search:[fa,'FaSearch'],shield:[fa,'FaShieldAlt'],pdf:[fa,'FaFilePdf'],wa:[fa,'FaWhatsapp'],xls:[fa,'FaFileExcel'],mob:[fa,'FaMobileAlt'],
 tab:[fa,'FaTabletAlt'],lap:[fa,'FaLaptop'],moon:[fa,'FaMoon'],sync:[fa,'FaSyncAlt'],rocket:[fa,'FaRocket'],hand:[fa,'FaHandshake'],flask:[fa,'FaFlask'],layers:[fa,'FaLayerGroup'],
 brain:[fa,'FaBrain'],run:[fa,'FaRunning'],steth:[fa,'FaStethoscope'],target:[fa,'FaBullseye'],paper:[fa,'FaStickyNote'],form:[fa,'FaWpforms'],folder:[fa,'FaFolderOpen'],link:[fa,'FaLink'],
 bolt:[fa,'FaBolt'],cloud:[fa,'FaCloudDownloadAlt'],user:[fa,'FaUserCircle'],ppt:[fa,'FaFilePowerpoint'],dumb:[fa,'FaDumbbell'],eye:[fa,'FaEye'],book:[fa,'FaBook'],trophy:[fa,'FaTrophy'],
 check:[fa,'FaCheckCircle'],play:[fa,'FaPlayCircle'],wifi:[md,'MdWifiOff'],grid:[fa,'FaTh'],star:[fa,'FaStar'],seed:[fa,'FaSeedling'],globe:[fa,'FaGlobeEurope'],video:[fa,'FaVideo'],idc:[fa,'FaIdBadge']};
(async()=>{ fs.mkdirSync('img/ic',{recursive:true});
 for(const [k,[lib,n]] of Object.entries(want)){ const C=lib[n]; if(!C){ console.log('missing',n); continue; }
   for(const [suf,color] of [['g','#F2BD4B'],['w','#FFFFFF'],['r','#6B1426']]){
     const svg=renderToStaticMarkup(React.createElement(C,{size:256,color}));
     await sharp(Buffer.from(svg)).png().toFile(`img/ic/${k}_${suf}.png`); } }
 console.log('icons ok'); })();
