import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const origin = request.nextUrl.origin
    const position = searchParams.get("position") || "bottom-right"
    const theme = searchParams.get("theme") || "dark"

    const script = `
(function() {
    "use strict";
    
    var AUDIT_API = "${origin}/api/audit";
    var position = "${position}";
    var theme = "${theme}";
    
    var colors = {
        dark: { bg: "#18181b", text: "#fafafa", border: "#3f3f46" },
        light: { bg: "#ffffff", text: "#18181b", border: "#e4e4e7" }
    };
    
    var c = colors[theme] || colors.dark;
    
    function getScoreColor(score) {
        if (score >= 80) return "#22c55e";
        if (score >= 60) return "#f97316";
        return "#ef4444";
    }
    
    function getPosition() {
        var positions = {
            "bottom-right": "bottom:16px;right:16px",
            "bottom-left": "bottom:16px;left:16px",
            "top-right": "top:16px;right:16px",
            "top-left": "top:16px;left:16px"
        };
        return positions[position] || positions["bottom-right"];
    }
    
    function createWidget(score) {
        var scoreColor = getScoreColor(score);
        var grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
        
        var widget = document.createElement("div");
        widget.id = "seo-auditor-widget";
        widget.style.cssText = "position:fixed;" + getPosition() + ";z-index:99999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
        
        widget.innerHTML = '<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:' + c.bg + ';color:' + c.text + ';border:1px solid ' + c.border + ';box-shadow:0 4px 12px rgba(0,0,0,0.15);cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;font-size:13px;" onmouseover="this.style.transform=\\'scale(1.05)\\';this.style.boxShadow=\\'0 6px 20px rgba(0,0,0,0.25)\\';" onmouseout="this.style.transform=\\'scale(1)\\';this.style.boxShadow=\\'0 4px 12px rgba(0,0,0,0.15)\\';"><div style="width:32px;height:32px;border-radius:50%;border:2.5px solid ' + scoreColor + ';display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:' + scoreColor + ';">' + score + '</div><div><div style="font-weight:600;font-size:12px;">SEO Score: ' + grade + '</div><div style="font-size:10px;opacity:0.6;">by AuditorPro</div></div></div>';
        
        widget.addEventListener("click", function() {
            window.open("${origin}/?url=" + encodeURIComponent(window.location.href), "_blank");
        });
        
        document.body.appendChild(widget);
    }
    
    function loadScore() {
        var url = window.location.href;
        
        fetch(AUDIT_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var score = Math.round(data.score || 0);
            createWidget(score);
        })
        .catch(function() {
            createWidget(0);
        });
    }
    
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadScore);
    } else {
        loadScore();
    }
})();
`

    return new NextResponse(script, {
        status: 200,
        headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
        },
    })
}
