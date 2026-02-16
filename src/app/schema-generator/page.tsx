"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, Copy, Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast-provider"

type SchemaType = "Organization" | "LocalBusiness" | "Article" | "Product" | "FAQPage" | "HowTo" | "BreadcrumbList"

const SCHEMA_TYPES: { type: SchemaType; label: string; desc: string }[] = [
    { type: "Organization", label: "Organization", desc: "Company or organization" },
    { type: "LocalBusiness", label: "Local Business", desc: "Business with physical location" },
    { type: "Article", label: "Article", desc: "Blog post or article" },
    { type: "Product", label: "Product", desc: "Product listing" },
    { type: "FAQPage", label: "FAQ Page", desc: "Frequently asked questions" },
    { type: "HowTo", label: "How-To", desc: "Step-by-step guide" },
    { type: "BreadcrumbList", label: "Breadcrumb", desc: "Site navigation path" },
]

export default function SchemaGeneratorPage() {
    const [schemaType, setSchemaType] = useState<SchemaType>("Organization")
    const [copied, setCopied] = useState(false)

    // Organization fields
    const [orgName, setOrgName] = useState("")
    const [orgUrl, setOrgUrl] = useState("")
    const [orgLogo, setOrgLogo] = useState("")
    const [orgPhone, setOrgPhone] = useState("")
    const [orgEmail, setOrgEmail] = useState("")

    // LocalBusiness fields
    const [bizStreet, setBizStreet] = useState("")
    const [bizCity, setBizCity] = useState("")
    const [bizState, setBizState] = useState("")
    const [bizZip, setBizZip] = useState("")
    const [bizCountry, setBizCountry] = useState("US")

    // Article fields
    const [articleTitle, setArticleTitle] = useState("")
    const [articleAuthor, setArticleAuthor] = useState("")
    const [articleDate, setArticleDate] = useState("")
    const [articleDesc, setArticleDesc] = useState("")
    const [articleImage, setArticleImage] = useState("")

    // Product fields
    const [prodName, setProdName] = useState("")
    const [prodDesc, setProdDesc] = useState("")
    const [prodPrice, setProdPrice] = useState("")
    const [prodCurrency, setProdCurrency] = useState("USD")
    const [prodImage, setProdImage] = useState("")
    const [prodAvail, setProdAvail] = useState("InStock")

    // FAQ fields
    const [faqItems, setFaqItems] = useState([{ q: "", a: "" }])

    // HowTo fields
    const [howToName, setHowToName] = useState("")
    const [howToDesc, setHowToDesc] = useState("")
    const [howToSteps, setHowToSteps] = useState([{ text: "" }])

    // Breadcrumb fields
    const [breadcrumbs, setBreadcrumbs] = useState([{ name: "Home", url: "/" }])

    const jsonLd = useMemo(() => {
        const base = { "@context": "https://schema.org" }

        switch (schemaType) {
            case "Organization":
                return JSON.stringify({
                    ...base,
                    "@type": "Organization",
                    name: orgName || "Your Company",
                    url: orgUrl || "https://example.com",
                    ...(orgLogo && { logo: orgLogo }),
                    ...(orgPhone && { telephone: orgPhone }),
                    ...(orgEmail && { email: orgEmail }),
                }, null, 2)

            case "LocalBusiness":
                return JSON.stringify({
                    ...base,
                    "@type": "LocalBusiness",
                    name: orgName || "Your Business",
                    url: orgUrl || "https://example.com",
                    ...(orgPhone && { telephone: orgPhone }),
                    address: {
                        "@type": "PostalAddress",
                        streetAddress: bizStreet,
                        addressLocality: bizCity,
                        addressRegion: bizState,
                        postalCode: bizZip,
                        addressCountry: bizCountry,
                    },
                }, null, 2)

            case "Article":
                return JSON.stringify({
                    ...base,
                    "@type": "Article",
                    headline: articleTitle || "Article Title",
                    author: { "@type": "Person", name: articleAuthor || "Author" },
                    datePublished: articleDate || new Date().toISOString().split("T")[0],
                    ...(articleDesc && { description: articleDesc }),
                    ...(articleImage && { image: articleImage }),
                }, null, 2)

            case "Product":
                return JSON.stringify({
                    ...base,
                    "@type": "Product",
                    name: prodName || "Product Name",
                    ...(prodDesc && { description: prodDesc }),
                    ...(prodImage && { image: prodImage }),
                    offers: {
                        "@type": "Offer",
                        price: prodPrice || "0",
                        priceCurrency: prodCurrency,
                        availability: `https://schema.org/${prodAvail}`,
                    },
                }, null, 2)

            case "FAQPage":
                return JSON.stringify({
                    ...base,
                    "@type": "FAQPage",
                    mainEntity: faqItems
                        .filter(f => f.q && f.a)
                        .map(f => ({
                            "@type": "Question",
                            name: f.q,
                            acceptedAnswer: { "@type": "Answer", text: f.a },
                        })),
                }, null, 2)

            case "HowTo":
                return JSON.stringify({
                    ...base,
                    "@type": "HowTo",
                    name: howToName || "How to Title",
                    ...(howToDesc && { description: howToDesc }),
                    step: howToSteps
                        .filter(s => s.text)
                        .map((s, i) => ({
                            "@type": "HowToStep",
                            position: i + 1,
                            text: s.text,
                        })),
                }, null, 2)

            case "BreadcrumbList":
                return JSON.stringify({
                    ...base,
                    "@type": "BreadcrumbList",
                    itemListElement: breadcrumbs.map((b, i) => ({
                        "@type": "ListItem",
                        position: i + 1,
                        name: b.name || `Page ${i + 1}`,
                        item: b.url || "/",
                    })),
                }, null, 2)

            default:
                return "{}"
        }
    }, [schemaType, orgName, orgUrl, orgLogo, orgPhone, orgEmail, bizStreet, bizCity, bizState, bizZip, bizCountry, articleTitle, articleAuthor, articleDate, articleDesc, articleImage, prodName, prodDesc, prodPrice, prodCurrency, prodImage, prodAvail, faqItems, howToName, howToDesc, howToSteps, breadcrumbs])

    const toast = useToast()

    const copyToClipboard = async () => {
        const snippet = `<script type="application/ld+json">\n${jsonLd}\n</script>`
        await navigator.clipboard.writeText(snippet)
        setCopied(true)
        toast.success("Schema markup copied to clipboard!")
        setTimeout(() => setCopied(false), 2000)
    }

    const renderFields = () => {
        switch (schemaType) {
            case "Organization":
            case "LocalBusiness":
                return (
                    <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className="text-sm font-medium">Name *</label><Input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Company Name" /></div>
                            <div className="space-y-1.5"><label className="text-sm font-medium">Website URL *</label><Input value={orgUrl} onChange={e => setOrgUrl(e.target.value)} placeholder="https://example.com" /></div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className="text-sm font-medium">Phone</label><Input value={orgPhone} onChange={e => setOrgPhone(e.target.value)} placeholder="+1-555-0100" /></div>
                            <div className="space-y-1.5"><label className="text-sm font-medium">{schemaType === "Organization" ? "Logo URL" : "Email"}</label><Input value={schemaType === "Organization" ? orgLogo : orgEmail} onChange={e => schemaType === "Organization" ? setOrgLogo(e.target.value) : setOrgEmail(e.target.value)} placeholder={schemaType === "Organization" ? "https://example.com/logo.png" : "info@example.com"} /></div>
                        </div>
                        {schemaType === "LocalBusiness" && (
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-1.5"><label className="text-sm font-medium">Street</label><Input value={bizStreet} onChange={e => setBizStreet(e.target.value)} placeholder="123 Main St" /></div>
                                <div className="space-y-1.5"><label className="text-sm font-medium">City</label><Input value={bizCity} onChange={e => setBizCity(e.target.value)} placeholder="Portland" /></div>
                                <div className="space-y-1.5"><label className="text-sm font-medium">State</label><Input value={bizState} onChange={e => setBizState(e.target.value)} placeholder="OR" /></div>
                                <div className="space-y-1.5"><label className="text-sm font-medium">ZIP</label><Input value={bizZip} onChange={e => setBizZip(e.target.value)} placeholder="97201" /></div>
                            </div>
                        )}
                    </div>
                )

            case "Article":
                return (
                    <div className="space-y-4">
                        <div className="space-y-1.5"><label className="text-sm font-medium">Headline *</label><Input value={articleTitle} onChange={e => setArticleTitle(e.target.value)} placeholder="Your Article Title" /></div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className="text-sm font-medium">Author</label><Input value={articleAuthor} onChange={e => setArticleAuthor(e.target.value)} placeholder="Author Name" /></div>
                            <div className="space-y-1.5"><label className="text-sm font-medium">Date Published</label><Input type="date" value={articleDate} onChange={e => setArticleDate(e.target.value)} /></div>
                        </div>
                        <div className="space-y-1.5"><label className="text-sm font-medium">Description</label><Textarea value={articleDesc} onChange={e => setArticleDesc(e.target.value)} placeholder="Article description" /></div>
                        <div className="space-y-1.5"><label className="text-sm font-medium">Image URL</label><Input value={articleImage} onChange={e => setArticleImage(e.target.value)} placeholder="https://example.com/image.jpg" /></div>
                    </div>
                )

            case "Product":
                return (
                    <div className="space-y-4">
                        <div className="space-y-1.5"><label className="text-sm font-medium">Product Name *</label><Input value={prodName} onChange={e => setProdName(e.target.value)} placeholder="Product Name" /></div>
                        <div className="space-y-1.5"><label className="text-sm font-medium">Description</label><Textarea value={prodDesc} onChange={e => setProdDesc(e.target.value)} placeholder="Product description" /></div>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="space-y-1.5"><label className="text-sm font-medium">Price</label><Input value={prodPrice} onChange={e => setProdPrice(e.target.value)} placeholder="29.99" /></div>
                            <div className="space-y-1.5"><label className="text-sm font-medium">Currency</label><Input value={prodCurrency} onChange={e => setProdCurrency(e.target.value)} placeholder="USD" /></div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Availability</label>
                                <select value={prodAvail} onChange={e => setProdAvail(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm">
                                    <option value="InStock">In Stock</option>
                                    <option value="OutOfStock">Out of Stock</option>
                                    <option value="PreOrder">Pre-Order</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1.5"><label className="text-sm font-medium">Image URL</label><Input value={prodImage} onChange={e => setProdImage(e.target.value)} placeholder="https://example.com/product.jpg" /></div>
                    </div>
                )

            case "FAQPage":
                return (
                    <div className="space-y-4">
                        {faqItems.map((item, i) => (
                            <div key={i} className="p-4 rounded-lg border border-border space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-muted-foreground">Question {i + 1}</span>
                                    {faqItems.length > 1 && (
                                        <Button variant="ghost" size="sm" onClick={() => setFaqItems(faqItems.filter((_, j) => j !== i))}>Remove</Button>
                                    )}
                                </div>
                                <Input value={item.q} onChange={e => { const n = [...faqItems]; n[i].q = e.target.value; setFaqItems(n) }} placeholder="Question" />
                                <Textarea value={item.a} onChange={e => { const n = [...faqItems]; n[i].a = e.target.value; setFaqItems(n) }} placeholder="Answer" className="h-20" />
                            </div>
                        ))}
                        <Button variant="outline" onClick={() => setFaqItems([...faqItems, { q: "", a: "" }])}>+ Add Question</Button>
                    </div>
                )

            case "HowTo":
                return (
                    <div className="space-y-4">
                        <div className="space-y-1.5"><label className="text-sm font-medium">Title *</label><Input value={howToName} onChange={e => setHowToName(e.target.value)} placeholder="How to Do Something" /></div>
                        <div className="space-y-1.5"><label className="text-sm font-medium">Description</label><Textarea value={howToDesc} onChange={e => setHowToDesc(e.target.value)} placeholder="A brief description of this how-to guide" /></div>
                        {howToSteps.map((step, i) => (
                            <div key={i} className="flex gap-3 items-start">
                                <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0 mt-1">{i + 1}</span>
                                <div className="flex-1">
                                    <Input value={step.text} onChange={e => { const n = [...howToSteps]; n[i].text = e.target.value; setHowToSteps(n) }} placeholder={`Step ${i + 1}`} />
                                </div>
                                {howToSteps.length > 1 && (
                                    <Button variant="ghost" size="sm" onClick={() => setHowToSteps(howToSteps.filter((_, j) => j !== i))}>×</Button>
                                )}
                            </div>
                        ))}
                        <Button variant="outline" onClick={() => setHowToSteps([...howToSteps, { text: "" }])}>+ Add Step</Button>
                    </div>
                )

            case "BreadcrumbList":
                return (
                    <div className="space-y-4">
                        {breadcrumbs.map((b, i) => (
                            <div key={i} className="grid grid-cols-[2fr_3fr_auto] gap-3 items-center">
                                <Input value={b.name} onChange={e => { const n = [...breadcrumbs]; n[i].name = e.target.value; setBreadcrumbs(n) }} placeholder="Page Name" />
                                <Input value={b.url} onChange={e => { const n = [...breadcrumbs]; n[i].url = e.target.value; setBreadcrumbs(n) }} placeholder="/path" />
                                {breadcrumbs.length > 1 && (
                                    <Button variant="ghost" size="sm" onClick={() => setBreadcrumbs(breadcrumbs.filter((_, j) => j !== i))}>×</Button>
                                )}
                            </div>
                        ))}
                        <Button variant="outline" onClick={() => setBreadcrumbs([...breadcrumbs, { name: "", url: "" }])}>+ Add Crumb</Button>
                    </div>
                )
        }
    }

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Schema Markup Generator</h2>
                    <p className="text-muted-foreground">Generate JSON-LD structured data for your pages. Just fill in the fields and copy the code.</p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Left: Form */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Schema Type</CardTitle>
                            <CardDescription>Choose the type of structured data to generate</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {SCHEMA_TYPES.map(st => (
                                    <button
                                        key={st.type}
                                        onClick={() => setSchemaType(st.type)}
                                        className={`p-3 rounded-lg border text-left transition-all text-sm ${schemaType === st.type
                                            ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30 shadow-sm"
                                            : "border-border hover:border-zinc-300 dark:hover:border-zinc-700"
                                            }`}
                                    >
                                        <p className="font-medium">{st.label}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{st.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{SCHEMA_TYPES.find(s => s.type === schemaType)?.label} Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {renderFields()}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Preview */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-sm">Generated JSON-LD</CardTitle>
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={copyToClipboard}>
                                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                {copied ? "Copied!" : "Copy Code"}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <pre className="p-4 bg-zinc-950 text-zinc-100 rounded-lg text-xs overflow-x-auto leading-relaxed">
                                <code>{`<script type="application/ld+json">\n${jsonLd}\n</script>`}</code>
                            </pre>
                        </CardContent>
                    </Card>

                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
                        <span className="font-bold">How to use:</span> Copy the code above and paste it into your page&apos;s <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">&lt;head&gt;</code> section. Google will use this to generate rich results in search.
                    </div>
                </div>
            </div>
        </div>
    )
}
