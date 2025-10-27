// Wrapper simples para chamadas à API com Authorization automático
(function(window){
  const DEFAULT_BASE = '/api';
  const getBase = ()=> window.__API_BASE__ || DEFAULT_BASE;

  async function apiFetch(path, opts={}){
    const base = getBase();
    const url = path.startsWith('http') ? path : (base + (path.startsWith('/')?path:'/'+path));
    opts.headers = opts.headers || {};
    // assegura JSON por padrão quando houver body
    if(opts.body && !(opts.body instanceof FormData) && !opts.headers['Content-Type']){
      opts.headers['Content-Type'] = 'application/json';
      if(typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
    }

    const token = window.Auth && window.Auth.getToken ? window.Auth.getToken() : null;
    if(token){ opts.headers['Authorization'] = 'Bearer ' + token; }

    const res = await fetch(url, opts);
    let payload = null;
    try{ payload = await res.json(); }catch(e){ payload = null; }
    if(!res.ok){ const err = new Error(payload && payload.error ? payload.error : ('HTTP '+res.status)); err.response = res; err.payload = payload; throw err; }
    return payload;
  }

  window.apiFetch = apiFetch;
  window.API = {
    fetch: apiFetch,
    base: getBase
  };
})(window);
