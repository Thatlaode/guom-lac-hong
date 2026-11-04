const T = THREE;
const mat = (c, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0 }, o));
function part(geo, m, x, y, z, parent) {
  const me = new T.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true;
  if (parent) parent.add(me); return me;
}

