(function(){
  'use strict';

  // The original plan library was prototyped in a manufacturing context.
  // This helper keeps the behavioural intent but removes industry-specific wording
  // from the user-facing plan so the Leadership 360 product works across functions.
  const rules = [
    [/pamainos meistro\/operatoriaus ar techniko/gi,'komandos nario ar kolegos'],
    [/pamainos meistro, operatoriaus ar techniko/gi,'komandos nario ar kolegos'],
    [/pamainos meistro/gi,'komandos koordinatoriaus'],
    [/meistro susitikime/gi,'komandos susitikime'],
    [/meistrų susitikime/gi,'komandos susitikime'],
    [/meistrui/gi,'komandos nariui'],
    [/meistro/gi,'komandos nario'],
    [/operatoriaus/gi,'komandos nario'],
    [/operatorių/gi,'komandos narių'],
    [/pavaldiniui/gi,'komandos nariui'],
    [/pavaldinių/gi,'komandos narių'],
    [/pavaldiniu/gi,'komandos nariu'],
    [/pavaldinį/gi,'komandos narį'],
    [/pavaldiniai/gi,'komandos nariai'],
    [/pamainų bloko pradžia/gi,'darbo savaitės pradžia'],
    [/pamainų bloko pabaiga/gi,'darbo savaitės pabaiga'],
    [/pirmos pamainos pradžioje/gi,'savaitės pradžioje'],
    [/pirmos pamainos pradžia/gi,'savaitės pradžia'],
    [/paskutinę pamainą/gi,'savaitės pabaigoje'],
    [/pamainos briefinge/gi,'komandos susitikime'],
    [/pamainos briefingas/gi,'komandos susitikimas'],
    [/pamainos susitikimus? \(briefings\)/gi,'komandos susitikimus'],
    [/pamainos susitikimas/gi,'komandos susitikimas'],
    [/pamainos susitikime/gi,'komandos susitikime'],
    [/kitomis pamainomis/gi,'kitomis komandomis'],
    [/pamainomis/gi,'komandomis'],
    [/pamainos/gi,'komandos'],
    [/pamainų/gi,'komandų'],
    [/cecho lygmeniu/gi,'kasdieniame darbe'],
    [/cecho/gi,'darbo vietos'],
    [/gamykloje/gi,'organizacijoje'],
    [/gamyklos/gi,'organizacijos'],
    [/gamyklą/gi,'organizaciją'],
    [/gamybinį procesą/gi,'darbo procesą'],
    [/gamybinio proceso/gi,'darbo proceso'],
    [/gamybinius procesus/gi,'darbo procesus'],
    [/gamybinių procesų/gi,'darbo procesų'],
    [/gamybinį sprendimą/gi,'darbo sprendimą'],
    [/gamybinius sprendimus/gi,'darbo sprendimus'],
    [/gamybinių sprendimų/gi,'darbo sprendimų'],
    [/gamybinio sprendimo/gi,'darbo sprendimo'],
    [/gamybos technologijų/gi,'darbo technologijų'],
    [/gamybos technologija/gi,'darbo technologija'],
    [/gamybos technologijas/gi,'darbo technologijas'],
    [/gamybos rodikliai/gi,'veiklos rodikliai'],
    [/gamybos rodiklių/gi,'veiklos rodiklių'],
    [/gamybos prioritetai/gi,'veiklos prioritetai'],
    [/gamybos prioritetų/gi,'veiklos prioritetų'],
    [/gamybos tikslus/gi,'veiklos tikslus'],
    [/gamybos tikslai/gi,'veiklos tikslai'],
    [/gamybos kontekstui/gi,'darbo kontekstui'],
    [/gamybos kontekste/gi,'darbo kontekste'],
    [/gamybos duomenis/gi,'veiklos duomenis'],
    [/gamybos duomenų/gi,'veiklos duomenų'],
    [/gamybos planą/gi,'veiklos planą'],
    [/gamybos plano/gi,'veiklos plano'],
    [/gamybos efektyvumą/gi,'veiklos efektyvumą'],
    [/gamybos efektyvumas/gi,'veiklos efektyvumas'],
    [/gamybos sąnaudas/gi,'veiklos sąnaudas'],
    [/gamybos savikainą/gi,'veiklos sąnaudas'],
    [/gamybos/gi,'veiklos'],
    [/gamybiniai/gi,'veiklos'],
    [/gamybinių/gi,'veiklos'],
    [/gamybinis/gi,'veiklos'],
    [/gamybinę/gi,'veiklos'],
    [/gamybinės/gi,'veiklos'],
    [/MES, SCADA, ERP, kokybės sistemas/gi,'naudojamas skaitmenines sistemas ir darbo įrankius'],
    [/MES\/SCADA\/ERP/gi,'naudojamas skaitmenines sistemas'],
    [/MES\/ERP/gi,'naudojamų sistemų'],
    [/MES|SCADA|ERP/g,'skaitmeninė sistema'],
    [/IT ar proceso inžinieriaus/gi,'IT ar proceso eksperto'],
    [/IT ar proceso inžinieriais/gi,'IT ar proceso ekspertais'],
    [/proceso inžinieriaus/gi,'proceso eksperto'],
    [/proceso inžinieriais/gi,'proceso ekspertais'],
    [/TPM kortelėms/gi,'priežiūros kortelėms'],
    [/TPM/gi,'procesų priežiūros'],
    [/Kaizen projektas/gi,'tobulinimo iniciatyva'],
    [/Kaizen/gi,'tobulinimo'],
    [/OEE arba kokybės rodiklis/gi,'pasirinktas veiklos ar kokybės rodiklis'],
    [/OEE, savikaina, kokybė/gi,'efektyvumas, sąnaudos ir kokybė'],
    [/OEE/gi,'veiklos efektyvumo rodiklis'],
    [/gedimų žurnalas/gi,'problemų žurnalas'],
    [/gedimus/gi,'problemas'],
    [/gedimų/gi,'problemų'],
    [/gedimo/gi,'problemos'],
    [/anomalijas/gi,'problemas ar nukrypimus'],
    [/anomalijų/gi,'problemų ar nukrypimų'],
    [/saugos veiksmai/gi,'rizikų valdymo veiksmai'],
    [/saugos ribos/gi,'rizikos ribos'],
    [/įrangos/gi,'darbo priemonių'],
    [/įranga/gi,'darbo priemonė'],
    [/įrangą/gi,'darbo priemonę'],
    [/kokybės auditoriaus/gi,'kokybės ar atitikties kolegos'],
    [/kokybės ar eksporto skyriumi/gi,'kokybės, klientų ar rinkos kolegomis'],
    [/eksportinių rinkų reikalavimus \(CE, ISO, klientų specifikacijos\)/gi,'klientų, rinkos ir atitikties reikalavimus'],
    [/eksportinių rinkų/gi,'skirtingų klientų ir rinkų'],
    [/CE, ISO, klientų specifikacijos/gi,'klientų ir atitikties reikalavimai'],
    [/pramonės standartas/gi,'profesinis ar veiklos standartas'],
    [/pažangų gamybos partnerį/gi,'pažangų veiklos partnerį'],
    [/globalios gamybos tendencijų/gi,'globalių veiklos tendencijų'],
    [/skaitmeninimo sprendimas/gi,'skaitmeninis darbo sprendimas'],
    [/skaitmenizuotas procesas/gi,'patobulintas skaitmeninis procesas'],
    [/skaitmeninimą jūsų srityje/gi,'skaitmeninį darbo būdą savo srityje'],
    [/komandos tech apžvalga/gi,'komandos skaitmeninių darbo būdų apžvalga'],
    [/tech-apžvalgos/gi,'skaitmeninių darbo būdų apžvalgos'],
    [/technologijų įžvalga/gi,'skaitmeninių darbo būdų įžvalga']
  ];

  function rewriteText(text){
    let out=String(text||'');
    for(const [pattern,replacement] of rules) out=out.replace(pattern,replacement);
    return out;
  }

  function rewrite(root){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      const next=rewriteText(node.nodeValue);
      if(next!==node.nodeValue)node.nodeValue=next;
    }
  }

  function apply(){ rewrite(document.getElementById('planOutput')); }

  document.addEventListener('click',event=>{
    if(event.target?.id==='generateBtn'){
      setTimeout(apply,0);setTimeout(apply,80);setTimeout(apply,250);
    }
  },true);

  const observer=new MutationObserver(mutations=>{
    for(const m of mutations){
      for(const node of m.addedNodes){
        if(node.nodeType===1||node.nodeType===3)rewrite(node.nodeType===1?node:node.parentElement);
      }
    }
  });
  const output=document.getElementById('planOutput');
  if(output)observer.observe(output,{childList:true,subtree:true});
  setTimeout(apply,500);
})();
