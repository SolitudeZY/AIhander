const $=q=>document.querySelector(q);
const state={ws:null,channels:new Map(),statuses:new Map(),session:"",alarms:[]};
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const number=value=>value==null?"—":Number(value).toFixed(1);
const term=new Terminal({cursorBlink:true,cursorStyle:"block",fontFamily:'Consolas,"Courier New",monospace',fontSize:14,scrollback:5000,convertEol:false,disableStdin:true,theme:{background:"#080b10",foreground:"#d8e2dc",cursor:"#f3f6f4",selectionBackground:"#315a7d"}});
const fitAddon=new FitAddon.FitAddon();
term.loadAddon(fitAddon);term.open($("#screen"));

function showPage(name){
    document.querySelectorAll(".nav-item,.view-content").forEach(node=>node.classList.remove("active"));
    document.querySelector(`.nav-item[data-page="${name}"]`)?.classList.add("active");
    $("#"+name)?.classList.add("active");
    if(name==="terminal") requestAnimationFrame(()=>fitAddon.fit());
}
document.querySelectorAll(".nav-item[data-page]").forEach(button=>button.onclick=()=>showPage(button.dataset.page));
document.querySelectorAll("[data-page-link]").forEach(button=>button.onclick=()=>showPage(button.dataset.pageLink));

function send(cmd,values={}){
    if(state.ws?.readyState===WebSocket.OPEN) state.ws.send(JSON.stringify({_from:"setUp",cmd,time:new Date().toISOString(),values}));
}
function setConnection(online){
    $("#dot").classList.toggle("on",online);
    $("#state").textContent=online?"Agent 已连接":"Agent 离线";
    $("#agent").textContent=online?"在线":"离线";
    $("#agentBadge").textContent=online?"Agent 在线":"Agent 离线";
    $("#agentBadge").classList.toggle("online",online);
    $("#updated").textContent=online?"最近更新 "+new Date().toLocaleTimeString():"正在等待 Agent…";
}
function connect(){
    state.ws=new WebSocket(`${location.protocol==="https:"?"wss":"ws"}://${location.host}/api/v1/setup/connect`);
    state.ws.onopen=()=>{refreshConnection();send("channelList",{})};
    state.ws.onclose=()=>{$("#state").textContent="setUp 页面连接中断";setConnection(false);setTimeout(connect,2000)};
    state.ws.onmessage=event=>handle(JSON.parse(event.data));
}
function handle(message){
    const value=message.values||{};
    $("#updated").textContent="最近更新 "+new Date().toLocaleTimeString();
    switch(message.cmd){
    case "heartbeat":
        setConnection(true);$("#cpu").textContent=number(value.cpu_percent)+"%";$("#memory").textContent=number(value.memory_used_percent)+"%";$("#disk").textContent=number(value.disk_used_percent)+"%";break;
    case "channelListResult":
        state.channels.clear();(value.channels||[]).forEach(channel=>state.channels.set(channel.channelId,channel));renderChannels();break;
    case "channelStatusChanged":
        state.statuses.set(value.channelId,value);renderChannels();break;
    case "channelSet":case "channelDelete":
        if(!value.operate){alert(value.err||"配置失败，请重试");break}
        send("channelList",{});break;
    case "alarmReport": loadAlarms();break;
    case "terminal.output": term.write(decodeBytes(value.data));break;
    case "terminal.opened": $("#terminalState").textContent=`运行中 · PID ${value.pid}`;term.options.disableStdin=false;term.focus();break;
    case "terminal.exited": term.writeln(`\r\n\x1b[33m[进程退出 ${value.exit_code}]\x1b[0m`);terminalEnabled(false);break;
    case "terminal.error": term.writeln(`\r\n\x1b[31m[错误] ${value.message}\x1b[0m`);terminalEnabled(false);break;
    }
}

function pictureSummary(metrics={}){return `黑屏 ${number(metrics.black_screen)} / 遮挡 ${number(metrics.occlusion)} / 模糊 ${number(metrics.blur)} / 亮度 ${number(metrics.brightness_abnormal)}`}
function renderChannels(){
    const body=$("#channelList"),channels=[...state.channels.values()];
    $("#channelSummary").textContent=`共 ${channels.length} 路视频通道，其中 ${channels.filter(c=>state.statuses.get(c.channelId)?.status==="running").length} 路运行中`;
    if(!channels.length){body.innerHTML='<tr><td class="empty-cell" colspan="7">暂无视频通道</td></tr>';return}
    body.innerHTML=channels.map(channel=>{
        const status=state.statuses.get(channel.channelId)||{},metrics=status.pictureMetrics||{};
        const src=status.snapshot?`data:${status.snapshotMimeType||"image/jpeg"};base64,${status.snapshot}`:"";
        return `<tr><td><div class="channel-main">${esc(channel.name)}</div><div class="channel-meta">${esc(channel.channelId)}<br>${esc(channel.rtspUrl)}</div></td><td><span class="channel-state ${esc(status.status||"offline")}">${esc(status.status||"等待状态")}</span></td><td><div class="picture-result">${src?`<button class="snapshot-button" data-large="${src}" data-channel="${esc(channel.channelId)}"><img class="channel-snapshot" src="${src}" alt="通道画面"></button>`:'<span class="muted">等待画面</span>'}<span class="picture-badge">${pictureSummary(metrics)}</span></div></td><td>${esc(channel.moduleName)}</td><td>${number(status.inputFps)} FPS</td><td><span class="sync-text">已生效</span></td><td><div class="channel-actions"><button class="btn secondary" data-edit="${esc(channel.channelId)}">编辑</button><button class="btn danger" data-delete="${esc(channel.channelId)}">删除</button></div></td></tr>`;
    }).join("");
    bindImages();
    body.querySelectorAll("[data-edit]").forEach(button=>button.onclick=()=>openEditor(state.channels.get(button.dataset.edit)));
    body.querySelectorAll("[data-delete]").forEach(button=>button.onclick=()=>{const channel=state.channels.get(button.dataset.delete);if(confirm(`确认删除通道“${channel.name}”？`))send("channelDelete",{channelId:channel.channelId,expectedRevision:channel.revision})});
}

function openEditor(channel={}){
    $("#channelEditor").hidden=false;$("#editorTitle").textContent=channel.channelId?"编辑视频通道":"添加视频通道";
    $("#cid").value=channel.channelId||"";$("#cid").disabled=!!channel.channelId;$("#name").value=channel.name||"";$("#rtsp").value=channel.rtspUrl||"";$("#model").value=channel.moduleName||"";$("#form").dataset.revision=channel.revision||0;
}
function closeEditor(){$("#channelEditor").hidden=true}
$("#add").onclick=()=>openEditor();$("#cancel").onclick=closeEditor;$("#editorClose").onclick=closeEditor;
$("#form").onsubmit=event=>{event.preventDefault();const revision=Number(event.currentTarget.dataset.revision||0),value={channelId:$("#cid").value.trim(),name:$("#name").value.trim(),rtspUrl:$("#rtsp").value.trim(),moduleName:$("#model").value.trim(),enabled:true,transport:"tcp"};if(revision)value.expectedRevision=revision;send("channelSet",value);closeEditor()};

function alarmRows(alarms,columns){
    if(!alarms.length)return `<tr><td class="empty-cell" colspan="${columns}">暂无告警记录</td></tr>`;
    return alarms.map(alarm=>`<tr><td>${alarm.imageUrl?`<img class="alarm-thumbnail" src="${alarm.imageUrl}" data-large="${alarm.imageUrl}" data-caption="${esc(alarm.channelId)} · ${esc(alarm.alarmTime)}">`:'<span class="muted">无图片</span>'}</td><td>${esc(new Date(alarm.alarmTime).toLocaleString())}</td><td><strong>${esc(alarm.channelId)}</strong></td><td><span class="alarm-type">${esc(alarm.detectionType)}</span></td><td><span class="alarm-confidence">${Number(alarm.confidence).toFixed(2)}</span></td>${columns===6?`<td class="muted">#${alarm.rowId}</td>`:""}</tr>`).join("");
}
async function loadAlarms(){
    const response=await fetch("/api/v1/setup/alarms");if(!response.ok)return;
    state.alarms=await response.json();$("#alarmCount").textContent=state.alarms.length;$("#alarmSummary").textContent=`${state.alarms.length} 条`;
    $("#alarmList").innerHTML=alarmRows(state.alarms,6);$("#dashboardAlarms").innerHTML=alarmRows(state.alarms.slice(0,5),5);bindImages();
}
$("#refresh").onclick=loadAlarms;$("#dashboardRefresh").onclick=()=>{send("channelList",{});loadAlarms()};

function metricRow(title,detail,value){return `<div class="metric-result"><span class="metric-check">✓</span><span class="metric-copy"><strong>${title}</strong><small>${detail}</small></span><span class="metric-tag">正常</span></div>`}
function bindImages(){document.querySelectorAll("[data-large]").forEach(node=>node.onclick=()=>{const status=state.statuses.get(node.dataset.channel)||{},m=status.pictureMetrics||{};$("#large").src=node.dataset.large;$("#caption").textContent=node.dataset.caption||`${number(status.inputFps)} FPS · ${status.observedAt||""}`;$("#viewerTitle").textContent=node.dataset.channel?`${node.dataset.channel} 通道画面`:"告警图片";$("#viewerMetrics").innerHTML=node.dataset.channel?metricRow("黑屏",`${number(m.black_screen)}% 暗像素`,m.black_screen)+metricRow("严重遮挡",`${number(m.occlusion)}% 固定区域`,m.occlusion)+metricRow("严重模糊",`清晰度 ${number(m.blur)}`,m.blur)+metricRow("亮度异常",`平均亮度 ${number(m.brightness_abnormal)}`,m.brightness_abnormal):'<div class="empty-cell">告警快照</div>';$("#viewer").hidden=false})}
$("#closeViewer").onclick=()=>{$("#viewer").hidden=true};

function encode64(value){return btoa(unescape(encodeURIComponent(value)))}function decodeBytes(value){try{return Uint8Array.from(atob(value||""),char=>char.charCodeAt(0))}catch{return new Uint8Array()}}
function terminalEnabled(enabled){term.options.disableStdin=!enabled;$("#close").disabled=!enabled;$("#open").disabled=enabled;$("#terminalState").textContent=enabled?"正在创建 Shell…":"已关闭";if(enabled)term.focus()}
$("#open").onclick=()=>{state.session="setup-"+Date.now();fitAddon.fit();term.reset();term.clear();send("terminal.open",{session_id:state.session,shell:"powershell.exe",cols:term.cols,rows:term.rows});terminalEnabled(true)};
$("#close").onclick=()=>{send("terminal.close",{session_id:state.session});state.session="";terminalEnabled(false)};
term.onData(data=>{if(state.session&&!term.options.disableStdin)send("terminal.input",{session_id:state.session,data:encode64(data)})});
term.onResize(size=>{if(state.session&&!term.options.disableStdin)send("terminal.resize",{session_id:state.session,cols:size.cols,rows:size.rows})});
window.addEventListener("resize",()=>{if($("#terminal").classList.contains("active"))fitAddon.fit()});
window.addEventListener("beforeunload",()=>{if(state.session)send("terminal.close",{session_id:state.session})});

function refreshConnection(){fetch("/api/v1/setup/device").then(r=>r.json()).then(value=>setConnection(Boolean(value.agentOnline))).catch(()=>setConnection(false))}
connect();loadAlarms();setInterval(refreshConnection,5000);
