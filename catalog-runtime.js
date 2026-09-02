(() => {
  'use strict';

  function create(options={}) {
    const officialEntities=Array.isArray(options.officialEntities)?options.officialEntities:[];
    const getCustomEntities=typeof options.getCustomEntities==='function'?options.getCustomEntities:()=>[];
    let entities=[];
    let entityById=new Map();
    let categories=[];

    function refresh() {
      const custom=getCustomEntities();
      entities=[...officialEntities,...(Array.isArray(custom)?custom:[])];
      entityById=new Map(entities.map(entity=>[entity.id,entity]));
      categories=[...new Set(
        entities.flatMap(entity=>Object.values(entity.scenarios||{}).map(block=>block?.category).filter(Boolean))
      )];
      return api;
    }
    function all(){return entities;}
    function get(id){return entityById.get(id)||null;}
    function has(id){return entityById.has(id);}
    function categoryNames(){return categories;}

    const api=Object.freeze({refresh,all,get,has,categoryNames});
    return refresh();
  }

  window.CHECKLIST_CATALOG_RUNTIME=Object.freeze({create});
})();
