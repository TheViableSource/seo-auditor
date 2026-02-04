"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Info, Smartphone, Monitor } from "lucide-react"
import { SERP } from "@/lib/constants"

export default function SerpSimulator() {
  // Default values
  const [title, setTitle] = useState("Your Page Title Goes Here | Brand Name")
  const [desc, setDesc] = useState("This is an example of a meta description. Google usually cuts this off around 155-160 characters, so make sure your key point is early.")
  const [url, setUrl] = useState("www.example.com/category/page-name")
  const [isMobile, setIsMobile] = useState(false)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">SERP Simulator</h2>
        <p className="text-zinc-500">Preview how your page will look in Google Search results before you publish.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">

        {/* LEFT COLUMN: The Inputs */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Edit Metadata</CardTitle>
            <CardDescription>Optimize your snippet to increase Click-Through Rate (CTR).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Title Input */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label className="font-medium">SEO Title</label>
                <span className={title.length > SERP.TITLE_MAX_LENGTH ? "text-red-500 font-bold" : "text-zinc-500"}>
                  {title.length} / {SERP.TITLE_MAX_LENGTH} chars
                </span>
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter page title..."
              />
              <Progress value={(title.length / SERP.TITLE_MAX_LENGTH) * 100} className="h-1" />
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label className="font-medium">Meta Description</label>
                <span className={desc.length > SERP.DESCRIPTION_MAX_LENGTH ? "text-red-500 font-bold" : "text-zinc-500"}>
                  {desc.length} / {SERP.DESCRIPTION_MAX_LENGTH} chars
                </span>
              </div>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Enter meta description..."
                className="h-24"
              />
              <Progress value={(desc.length / SERP.DESCRIPTION_MAX_LENGTH) * 100} className="h-1" />
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Display URL</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="example.com/page"
              />
            </div>

          </CardContent>
        </Card>


        {/* RIGHT COLUMN: The Google Preview */}
        <div className="space-y-4">

          {/* Device Toggles */}
          <div className="flex gap-2 p-1 bg-zinc-100 w-fit rounded-lg">
            <button
              onClick={() => setIsMobile(false)}
              className={`p-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${!isMobile ? "bg-white shadow-sm text-black" : "text-zinc-500"}`}
            >
              <Monitor className="w-4 h-4" /> Desktop
            </button>
            <button
              onClick={() => setIsMobile(true)}
              className={`p-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${isMobile ? "bg-white shadow-sm text-black" : "text-zinc-500"}`}
            >
              <Smartphone className="w-4 h-4" /> Mobile
            </button>
          </div>

          {/* THE PREVIEW CARD */}
          <Card className="overflow-hidden border-zinc-200 shadow-sm">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 pb-4">
              <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Google {isMobile ? "Mobile" : "Desktop"} Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 bg-white min-h-[200px]">

              {/* This mimics the Google Search Result Structure */}
              <div className="max-w-[600px] font-sans">

                {/* 1. Breadcrumb / URL Line */}
                <div className="flex items-center gap-3 mb-1 group cursor-pointer">
                  <div className="w-7 h-7 bg-zinc-100 rounded-full flex items-center justify-center text-[10px] text-zinc-500 border border-zinc-200">
                     {/* Fake Favicon */}
                    G
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm text-zinc-800 font-medium line-clamp-1">{url.split('/')[0] || "example.com"}</span>
                    <span className="text-xs text-zinc-500 line-clamp-1">{url}</span>
                  </div>
                </div>

                {/* 2. The Title (Blue Link) */}
                <h3 className="text-xl text-[#1a0dab] hover:underline cursor-pointer truncate font-medium mb-1 leading-snug">
                  {title || "Page Title"}
                </h3>

                {/* 3. The Description */}
                <div className="text-sm text-[#4d5156] leading-relaxed break-words">
                  <span className="text-zinc-500 text-xs mr-2">{new Date().toDateString().split(' ').slice(1,3).join(' ')} — </span>
                  {desc || "Meta description will appear here..."}
                </div>

              </div>

            </CardContent>
          </Card>

          {/* SEO Pro Tip Box */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
             <span className="font-bold">Pro Tip:</span>
             {title.length > SERP.TITLE_MAX_LENGTH
               ? " Your title is too long! Google will likely rewrite it or truncate it with '...'"
               : " Keep your main keyword near the front of the title for better impact."}
          </div>

        </div>
      </div>
    </div>
  )
}
