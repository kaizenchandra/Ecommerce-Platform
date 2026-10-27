export function ProductArt({category,title}:{category:string;title:string}) {
  const kind=category.toLowerCase();
  return <div className={`product-art ${kind.includes("light")?"art-gold":kind.includes("text")?"art-rose":"art-sage"}`}>
    <svg viewBox="0 0 400 320" role="img" aria-label={`${title} — illustrative catalog artwork`}>
      <ellipse cx="200" cy="270" rx="112" ry="14" fill="currentColor" opacity=".09"/>
      {kind.includes("light")?<><path d="M197 155h8v109h-8z" fill="#765c36"/><ellipse cx="201" cy="260" rx="60" ry="9" fill="#95744d"/><path d="M137 80q64-30 128 0l35 104H102z" fill="#e8c48d"/><path d="M137 80q64-30 128 0" fill="none" stroke="#b98c53" strokeWidth="5"/><ellipse cx="201" cy="184" rx="98" ry="10" fill="#b58d55"/></>:kind.includes("text")?<><path d="M103 94l190-10 24 160-203 16z" fill="#b96d53"/><path d="M108 101l181-9 20 145-189 15z" fill="#d7987b"/><path d="M143 99l9 148m30-151 9 149m30-150 9 145m30-145 9 143" stroke="#f1d3b4" strokeWidth="8"/><path d="M112 140l184-10m-178 54 185-11m-179 53 186-11" stroke="#9c624e" strokeWidth="5"/></>:<><path d="M129 120h130v90q0 54-65 54t-65-54z" fill="#87a49a"/><ellipse cx="194" cy="120" rx="65" ry="17" fill="#c3d2c7"/><ellipse cx="194" cy="120" rx="53" ry="11" fill="#526f65"/><path d="M260 143c67-12 62 81-3 72" fill="none" stroke="#87a49a" strokeWidth="20"/><path d="M149 143v62q0 29 20 35" stroke="#b5cbc1" strokeWidth="6" fill="none" strokeLinecap="round"/></>}
    </svg><span>Illustrative collection</span>
  </div>;
}
