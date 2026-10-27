const urls=['http://127.0.0.1:8080/actuator/health','http://127.0.0.1:8081/health','http://127.0.0.1:3000'];
for(const url of urls){let ready=false;for(let i=0;i<120;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(2000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}if(!ready)throw new Error('Not ready: '+url);console.log('Ready:',url);}
