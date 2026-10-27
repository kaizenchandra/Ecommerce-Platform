"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main id="main" className="page-shell"><h1>Let’s try that again.</h1><p role="alert">The marketplace could not load this page. Your payment status has not been changed.</p><button className="button" onClick={reset}>Try again</button></main>;}
