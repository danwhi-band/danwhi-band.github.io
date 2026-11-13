'use strict';
/* Original lightweight mesh paper. Native scroll drives a curved, sequentially
   released sheet; no imported calendar code, audio, input capture or tracking. */
(() => {
 const scene=document.getElementById('band-intro');if(!scene)return;
 const stage=document.getElementById('intro-paper-stage'),canvas=document.getElementById('intro-paper-canvas'),replay=document.getElementById('intro-replay');
 const root=document.documentElement,pref=window.matchMedia('(prefers-reduced-motion: reduce)');
 const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
 let ctx=null,raf=0,active=false,ready=false,p=0,target=0,opened=false,replaying=false,released=false,last=0,dead=false;
 const still=()=>pref.matches||root.classList.contains('motion-still');
 function finish(){p=target=1;scene.dataset.paperProgress='1.000';opened=true;replaying=false;released=false;scene.classList.add('paper-open');canvas.style.visibility='hidden';replay.hidden=still()||!ready;cancelAnimationFrame(raf);raf=0}
 if(still()){finish();return}
 if(!('IntersectionObserver' in window))return;
 try{ctx=canvas.getContext('2d',{alpha:true})}catch(_){return}
 if(!ctx)return;
 const N=18,M=26,H=1.23,verts=new Float32Array((N+1)*(M+1)*8),points=new Float32Array((N+1)*(M+1)*3),ids=[],tex=[];
 for(let y=0;y<M;y++)for(let x=0;x<N;x++){let a=y*(N+1)+x,b=a+1,c=a+N+1,d=c+1;ids.push(a,c,b,b,c,d)}
 function texture(back){const c=document.createElement('canvas');c.width=720;c.height=886;const x=c.getContext('2d');x.fillStyle=back?'#703039':'#903039';x.fillRect(0,0,720,886);
 // Deterministic ink grain; never touches the supplied poster image.
 for(let i=0;i<3600;i++){let a=(i*73)%720,b=(i*199)%886;x.fillStyle=i%2?'#ffffff09':'#00000010';x.fillRect(a,b,1+(i%3),1)}
 x.fillStyle='#181313';x.strokeStyle='#24161a';x.lineWidth=3;
 x.font='14px monospace';x.fillText(back?'DANWHI / REVERSE SIDE':'MOBICIAN REGULAR LIVE / DANWHI',42,64);
 x.beginPath();x.moveTo(42,86);x.lineTo(678,86);x.stroke();
 if(back){x.globalAlpha=.35;x.font='160px Anton';x.save();x.translate(660,600);x.rotate(-Math.PI/2);x.fillText('DANWHI',0,0);x.restore();x.globalAlpha=1;x.font='25px "Intro Noto"';x.fillText('단단한 결속. 휘몰아치는 울림.',44,780)}
 else{x.font='260px "Intro Black"';x.fillText('단휘.',30,432);x.font='142px Anton';x.fillText('DANWHI',44,593);x.beginPath();x.moveTo(44,635);x.lineTo(676,635);x.stroke();x.font='25px "Intro Noto"';x.fillText('일상의 다음 장, 우리의 무대.',44,691);x.font='16px monospace';x.fillText('SOUND / UNITY / RADIANCE',44,788);x.fillRect(44,814,174,6)}
 return c}
 function mesh(t){const lift=smooth(t/.68),fall=smooth((t-.58)/.42),turn=.02+fall*.65;
  for(let y=0;y<=M;y++)for(let x=0;x<=N;x++){const u=x/N,v=y/M,at=(y*(N+1)+x)*3;
   const line=1.02-lift*.93-(u-.5)*lift*.19,r=.22,dist=Math.max(0,v-line),a=Math.min(Math.PI*1.28,dist/r);
   let yy=v<=line?v:line+Math.sin(a)*r,zz=v<=line?0:(1-Math.cos(a))*r;
   // The top edge lets go from right to left. Jagged fibres stay on the binding.
   const cut=smooth((t-(.32+(1-u)*.18))/.17);yy+=cut*.16*(1-v*.35);zz+=cut*.06;
   let xx=(u-.5)+Math.sin(v*Math.PI)*lift*.025;
   yy=(yy-.5)*H;zz*=H;
   const rx=xx*Math.cos(turn)-yy*Math.sin(turn),ry=xx*Math.sin(turn)+yy*Math.cos(turn);
   points[at]=rx+fall*.53;points[at+1]=ry+fall*2.05;points[at+2]=zz-fall*.3;
   if(y===0)points[at+1]+=(x%3===0?.009:x%3===1?-.004:.002)*cut;
  }
  for(let y=0;y<=M;y++)for(let x=0;x<=N;x++){const i=y*(N+1)+x,a=i*3,b=i*8,l=(y*(N+1)+Math.max(0,x-1))*3,r=(y*(N+1)+Math.min(N,x+1))*3,up=(Math.max(0,y-1)*(N+1)+x)*3,dn=(Math.min(M,y+1)*(N+1)+x)*3;let ax=points[r]-points[l],ay=points[r+1]-points[l+1],az=points[r+2]-points[l+2],bx=points[dn]-points[up],by=points[dn+1]-points[up+1],bz=points[dn+2]-points[up+2];verts[b]=points[a];verts[b+1]=points[a+1];verts[b+2]=points[a+2];verts[b+3]=ay*bz-az*by;verts[b+4]=az*bx-ax*bz;verts[b+5]=ax*by-ay*bx;verts[b+6]=x/N;verts[b+7]=y/M}
 }
 function project(i,shadow=false){const b=i*8,z=verts[b+2],f=shadow?1:3/(3-z);return[(verts[b]+(shadow?z*.17:0))*1.61*f*canvas.width/2+canvas.width/2,(verts[b+1]+(shadow?z*.13:0))*1.35*f*canvas.height/2+canvas.height/2]}
 function triangle(a,b,c){const ps=[project(a),project(b),project(c)],is=[a,b,c],nz=(verts[a*8+5]+verts[b*8+5]+verts[c*8+5])/3,back=nz<0,source=tex[back?1:0];
  const uv=is.map(i=>[(back?1-verts[i*8+6]:verts[i*8+6])*source.width,verts[i*8+7]*source.height]);
  const [x0,y0]=uv[0],[x1,y1]=uv[1],[x2,y2]=uv[2],det=x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);if(Math.abs(det)<.01)return;
  const axis=k=>[(ps[0][k]*(y1-y2)+ps[1][k]*(y2-y0)+ps[2][k]*(y0-y1))/det,(ps[0][k]*(x2-x1)+ps[1][k]*(x0-x2)+ps[2][k]*(x1-x0))/det,(ps[0][k]*(x1*y2-x2*y1)+ps[1][k]*(x2*y0-x0*y2)+ps[2][k]*(x0*y1-x1*y0))/det];
  const xx=axis(0),yy=axis(1),cx=(ps[0][0]+ps[1][0]+ps[2][0])/3,cy=(ps[0][1]+ps[1][1]+ps[2][1])/3;
  ctx.save();ctx.beginPath();ps.forEach(([x,y],i)=>{const dx=x-cx,dy=y-cy,len=Math.hypot(dx,dy)||1;ctx[i?'lineTo':'moveTo'](x+dx/len*.45,y+dy/len*.45)});ctx.closePath();ctx.clip();ctx.setTransform(xx[0],yy[0],xx[1],yy[1],xx[2],yy[2]);ctx.drawImage(source,0,0);ctx.setTransform(1,0,0,1,0,0);
  let nx=(verts[a*8+3]+verts[b*8+3]+verts[c*8+3])/3,ny=(verts[a*8+4]+verts[b*8+4]+verts[c*8+4])/3,nn=nz;if(back){nx=-nx;ny=-ny;nn=-nn}const len=Math.hypot(nx,ny,nn)||1,light=.62+.38*Math.max(0,(-.3*nx-.55*ny+nn)/(len*1.18));ctx.fillStyle='rgba(0,0,0,'+(1-light).toFixed(3)+')';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();
 }
 function draw(t){if(!ready||dead)return;mesh(t);ctx.clearRect(0,0,canvas.width,canvas.height);
  const edge=[];for(let x=0;x<=N;x++)edge.push(x);for(let y=1;y<=M;y++)edge.push(y*(N+1)+N);for(let x=N-1;x>=0;x--)edge.push(M*(N+1)+x);for(let y=M-1;y>0;y--)edge.push(y*(N+1));
  ctx.save();ctx.beginPath();edge.forEach((id,i)=>{const q=project(id,true);ctx[i?'lineTo':'moveTo'](q[0],q[1])});ctx.closePath();ctx.shadowBlur=14*(canvas.width/500);ctx.shadowOffsetY=8;ctx.shadowColor='#0009';ctx.fillStyle='#0b080830';ctx.fill();ctx.restore();
  const faces=[];for(let i=0;i<ids.length;i+=3)faces.push([ids[i],ids[i+1],ids[i+2]]);faces.sort((a,b)=>(verts[a[0]*8+2]+verts[a[1]*8+2]+verts[a[2]*8+2])-(verts[b[0]*8+2]+verts[b[1]*8+2]+verts[b[2]*8+2]));for(const f of faces)triangle(...f);scene.dataset.paperProgress=t.toFixed(3)
 }
 function resize(){const r=stage.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.round(r.width*1.24*d);canvas.height=Math.round(r.height*1.2*d);draw(p)}
 function frame(now){raf=0;if(dead||document.hidden||!active||still()){if(still())finish();return}const dt=Math.min(40,Math.max(0,now-(last||now)));last=now;
  if(replaying)target=Math.min(1,target+dt/1650);else if(released)target=Math.min(1,target+dt/850);
  // A short damped follow-through, not scrolljacking or a long pinned chapter.
  p+= (target-p)*(1-Math.exp(-dt/74));if(target>=1&&p>.998){finish();return}draw(p);if(Math.abs(target-p)>.001||replaying||released)raf=requestAnimationFrame(frame)
 }
 function schedule(){if(!raf&&ready&&active&&!document.hidden&&!still()){last=0;raf=requestAnimationFrame(frame)}}
 function scroll(){if(opened||replaying)return;const r=stage.getBoundingClientRect(),vh=window.innerHeight;target=Math.max(target,smooth((vh*.64-r.top)/Math.max(220,r.height*.87)));if(target>=.68)released=true;if(r.bottom<0){finish();return}schedule()}
 function sync(){cancelAnimationFrame(raf);raf=0;if(still())finish();else if(!document.hidden){scroll();schedule()}}

 replay.addEventListener('click',()=>{if(still()||!ready)return;opened=false;released=false;replaying=true;p=target=0;scene.classList.remove('paper-open');canvas.style.visibility='visible';draw(0);schedule()});
 const io=new IntersectionObserver(entries=>{active=entries[0].isIntersecting;if(active){scroll();schedule()}else{cancelAnimationFrame(raf);raf=0}},{rootMargin:'100px 0px',threshold:0});io.observe(stage);
 window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',()=>{resize();scroll()},{passive:true});document.addEventListener('visibilitychange',sync);pref.addEventListener('change',sync);document.getElementById('motion-toggle')?.addEventListener('click',()=>queueMicrotask(sync));window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);raf=0});window.addEventListener('pageshow',sync);
 Promise.all([document.fonts.load('32px "Intro Black"','단휘.'),document.fonts.load('24px "Intro Noto"','일상의 다음 장, 우리의 무대.'),document.fonts.load('32px Anton','DANWHI')]).then(()=>{
  if(dead||still()){finish();return}tex.push(texture(false),texture(true));ready=true;scene.classList.add('paper-ready');replay.hidden=false;resize();scroll();schedule()
 }).catch(()=>{dead=true;scene.classList.remove('paper-ready');finish()});
})();
