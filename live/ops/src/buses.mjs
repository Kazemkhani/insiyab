import * as THREE from 'three';
/** Screen-space extrusion follows MapLibre projection; never captures input. */
export function mountBuses(map, host) {
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setClearColor(0,0);
  renderer.domElement.className='bus3d';
  renderer.domElement.setAttribute('aria-hidden','true');
  host.append(renderer.domElement);
  const scene=new THREE.Scene(), camera=new THREE.OrthographicCamera(0,1,0,1,-100,100);
  camera.position.z=50;
  const geometry=new THREE.BoxGeometry(12,6,5), dummy=new THREE.Object3D();
  const ink=new THREE.MeshBasicMaterial({color:0x15181d}), side=new THREE.MeshBasicMaterial({color:0x868787});
  const risk=new THREE.MeshBasicMaterial({color:0xc42b2b}), riskSide=new THREE.MeshBasicMaterial({color:0xde908e});
  const normal=new THREE.InstancedMesh(geometry,[side,side,side,side,ink,ink],2048);
  const late=new THREE.InstancedMesh(geometry,[riskSide,riskSide,riskSide,riskSide,risk,risk],2048);
  normal.count=late.count=0;normal.frustumCulled=late.frustumCulled=false;scene.add(normal,late);
  let buses=[], lateRoutes=new Set();
  function render() {
    normal.count=late.count=0;
    for (const bus of buses) {
      const p=map.project(bus.position), mesh=lateRoutes.has(bus.route)?late:normal;
      if(mesh.count>=2048)continue;
      dummy.position.set(p.x,p.y,0);dummy.rotation.set(.65,.2,-.45);dummy.updateMatrix();
      mesh.setMatrixAt(mesh.count++,dummy.matrix);
    }
    normal.instanceMatrix.needsUpdate=late.instanceMatrix.needsUpdate=true;
    renderer.domElement.dataset.count=String(buses.length);
    renderer.domElement.dataset.late=String(late.count);
    renderer.render(scene,camera);
  }
  function resize() {
    const {width,height}=host.getBoundingClientRect();
    renderer.setSize(width,height);camera.right=width;camera.bottom=height;camera.updateProjectionMatrix();render();
  }
  new ResizeObserver(resize).observe(host);
  map.on('move',render);resize();
  return {draw(next,routes){buses=next;lateRoutes=routes;render();}};
}
