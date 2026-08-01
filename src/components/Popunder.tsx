import { useEffect } from "react";
import { usePremium } from "@/lib/premium-context";

export default function Popunder() {
  const { isPremium } = usePremium();

  useEffect(() => {
    if (isPremium) return;

    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem("popupShownToday") === today) return;

    // Inject the popunder script — fires automatically on first click,
    // opens behind the current tab (background popunder).
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.setAttribute("data-cfasync", "false");
    script.async = true;
    script.text = `
      (function(){
        var f=window,
            o="d30bea4720177696b05f7b964db77713",
            u=[["siteId",543-579+171*521+5225975],["minBid",0],["popundersPerIP","0"],["delayBetween",0],["default",false],["defaultPerDay",0],["topmostLayer","auto"]],
            g=["d3d3LmJldHRlcmFkc3lzdGVtLmNvbS9NL2xwVG0vZWhpZ2hsaWdodGpzLWxpbmUtbnVtYmVycy5taW4uanM=","ZDJrazBvM2ZyN2VkMDEuY2xvdWRmcm9udC5uZXQvbGpzcy5taW4uanM="],
            y=-1,c,a,
            d=function(){
              clearTimeout(a);y++;
              if(g[y]&&!(1811496286000<(new Date).getTime()&&1<y)){
                c=f.document.createElement("script");
                c.type="text/javascript";c.async=!0;
                var k=f.document.getElementsByTagName("script")[0];
                c.src="https://"+atob(g[y]);
                c.crossOrigin="anonymous";
                c.onerror=d;
                c.onload=function(){clearTimeout(a);f[o.slice(0,16)+o.slice(0,16)]||d()};
                a=setTimeout(d,5E3);
                k.parentNode.insertBefore(c,k)
              }
            };
        if(!f[o]){try{Object.freeze(f[o]=u)}catch(e){}d()}
      })();
    `;
    document.head.appendChild(script);
    localStorage.setItem("popupShownToday", today);
  }, [isPremium]);

  return null;
}
