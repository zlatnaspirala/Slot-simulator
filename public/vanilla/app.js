const config={betPerSpin:1,reels:[
{strip:["A","K","Q","J","10","W","A","K","Q","J"]},
{strip:["A","K","Q","J","10","W","A","K","Q","J"]},
{strip:["A","K","Q","J","10","W","S","A","K","Q"]},
{strip:["A","K","Q","J","10","W","A","K","Q","J"]},
{strip:["A","K","Q","J","10","W","A","K","Q","J"]}]};
const $=id=>document.getElementById(id);
function preview(){ $("reels").innerHTML=config.reels.map((r,i)=>'<div style="display:inline-block;width:18%;margin-right:1%;vertical-align:top"><b>R'+(i+1)+'</b>'+r.strip.slice(0,3).map(s=>'<div class="panel" style="text-align:center">'+s+'</div>').join('')+'</div>').join('');}
async function post(url,body){const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text());return r.json();}
$("math").onclick=async()=>{const r=await post("/api/math",config);$("results").innerHTML='<div class="metric"><small>Theoretical RTP</small><b>'+(r.theoreticalRtp*100).toFixed(3)+'%</b></div>'};
$("sim").onclick=async()=>{const r=await post("/api/simulate",{config,spins:100000});$("results").innerHTML='<div class="metric"><small>Observed RTP</small><b>'+(r.rtp*100).toFixed(3)+'%</b></div><div class="metric"><small>Hit Frequency</small><b>'+(r.hitFrequency*100).toFixed(2)+'%</b></div><div class="metric"><small>Average Win</small><b>'+r.averageWin.toFixed(3)+'</b></div><div class="metric"><small>Max Win</small><b>'+r.maxWin.toFixed(2)+'</b></div>'};
preview();