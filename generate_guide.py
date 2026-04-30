from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

PAGE_W, PAGE_H = A4
MARGIN = 2 * cm

# ── Colour palette ────────────────────────────────────────────────────────────
NAVY   = colors.HexColor("#1e3a5f")
BLUE   = colors.HexColor("#2563eb")
LBLUE  = colors.HexColor("#dbeafe")
ORANGE = colors.HexColor("#ea580c")
LORANGE= colors.HexColor("#fff7ed")
GREEN  = colors.HexColor("#16a34a")
LGREEN = colors.HexColor("#dcfce7")
LGRAY  = colors.HexColor("#f8fafc")
MGRAY  = colors.HexColor("#e2e8f0")
DGRAY  = colors.HexColor("#374151")
WHITE  = colors.white

# ── Styles ────────────────────────────────────────────────────────────────────
ss = getSampleStyleSheet()

def S(name, **kw):
    base = ss["Normal"]
    return ParagraphStyle(name, parent=base, **kw)

body     = S("body",     fontSize=10, leading=15, textColor=DGRAY, spaceAfter=4)
body_j   = S("body_j",  fontSize=10, leading=15, textColor=DGRAY, alignment=TA_JUSTIFY, spaceAfter=4)
h1       = S("h1",  fontSize=22, leading=26, textColor=WHITE,   fontName="Helvetica-Bold", spaceAfter=6)
h2       = S("h2",  fontSize=13, leading=17, textColor=NAVY,    fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=5)
h3       = S("h3",  fontSize=10.5, leading=14, textColor=NAVY,  fontName="Helvetica-Bold", spaceBefore=6, spaceAfter=3)
note     = S("note",fontSize=9,  leading=13, textColor=colors.HexColor("#6b7280"), spaceAfter=4)
url_sty  = S("url", fontSize=9.5,leading=13, textColor=BLUE, fontName="Helvetica-Oblique", spaceAfter=2)
label_s  = S("lbl", fontSize=8.5,leading=12, textColor=colors.HexColor("#6b7280"), fontName="Helvetica-Bold", spaceAfter=1)
small_b  = S("sb",  fontSize=9,  leading=12, textColor=DGRAY,  fontName="Helvetica-Bold")

def bullet(text, indent=0.5):
    return Paragraph(
        f"<bullet>&bull;</bullet>{text}",
        ParagraphStyle("bul", parent=body, leftIndent=indent*cm,
                       bulletIndent=0, spaceBefore=2, spaceAfter=2, leading=14)
    )

def sub_bullet(text):
    return Paragraph(
        f"<bullet>&#8211;</bullet>{text}",
        ParagraphStyle("sbul", parent=body, leftIndent=1.1*cm,
                       bulletIndent=0, fontSize=9.5, leading=13, spaceAfter=1)
    )

def section_header(title, icon=""):
    full = f"{icon} {title}".strip()
    return [
        Spacer(1, 0.3*cm),
        Paragraph(full, h2),
        HRFlowable(width="100%", thickness=1.2, color=BLUE, spaceAfter=5),
    ]

def info_box(lines, bg=LBLUE, border=BLUE):
    """Renders a shaded info box."""
    content = "\n".join(lines)
    paras = [Paragraph(l, S("ib", fontSize=9.5, leading=14, textColor=DGRAY)) for l in lines]
    data = [[p] for p in paras]
    t = Table(data, colWidths=[PAGE_W - 2*MARGIN - 0.6*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg),
        ("BOX",        (0,0), (-1,-1), 0.8, border),
        ("LEFTPADDING",(0,0), (-1,-1), 10),
        ("RIGHTPADDING",(0,0),(-1,-1), 10),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1), 8),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[bg]),
    ]))
    return t

def step_table(steps):
    """Numbered steps in a clean table."""
    rows = []
    for i, (heading, detail) in enumerate(steps, 1):
        num_para = Paragraph(str(i), S("num", fontSize=13, fontName="Helvetica-Bold",
                                        textColor=BLUE, alignment=TA_CENTER))
        head_para= Paragraph(f"<b>{heading}</b>", S("sh", fontSize=10, leading=14, textColor=NAVY))
        det_para = Paragraph(detail, S("sd", fontSize=9.5, leading=13, textColor=DGRAY))
        rows.append([num_para, [head_para, det_para]])

    col_w = [1.1*cm, PAGE_W - 2*MARGIN - 1.1*cm - 0.4*cm]
    t = Table(rows, colWidths=col_w, spaceBefore=4)
    t.setStyle(TableStyle([
        ("VALIGN",      (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING",(0,0), (-1,-1), 8),
        ("TOPPADDING",  (0,0), (-1,-1), 7),
        ("BOTTOMPADDING",(0,0),(-1,-1), 7),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[WHITE, LGRAY]),
        ("BOX",         (0,0), (-1,-1), 0.5, MGRAY),
        ("LINEBELOW",   (0,0), (-1,-2), 0.4, MGRAY),
    ]))
    return t

def excel_col_table(cols):
    header = [
        Paragraph("Column Name", S("ch", fontSize=9, fontName="Helvetica-Bold", textColor=WHITE)),
        Paragraph("Format / Example", S("ch", fontSize=9, fontName="Helvetica-Bold", textColor=WHITE)),
        Paragraph("Required?", S("ch", fontSize=9, fontName="Helvetica-Bold", textColor=WHITE)),
    ]
    rows = [header]
    for name, fmt, req in cols:
        rows.append([
            Paragraph(f"<b>{name}</b>", S("cn", fontSize=9, leading=12, fontName="Helvetica-Bold", textColor=NAVY)),
            Paragraph(fmt,              S("cf", fontSize=9, leading=12, textColor=DGRAY)),
            Paragraph(req,              S("cr", fontSize=9, leading=12, textColor=GREEN if req=="Yes" else colors.HexColor("#9ca3af"))),
        ])
    avail = PAGE_W - 2*MARGIN
    t = Table(rows, colWidths=[avail*0.32, avail*0.48, avail*0.20])
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,0),  NAVY),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LGRAY]),
        ("BOX",          (0,0), (-1,-1), 0.6, MGRAY),
        ("LINEBELOW",    (0,0), (-1,-2), 0.4, MGRAY),
        ("LEFTPADDING",  (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("TOPPADDING",   (0,0), (-1,-1), 6),
        ("BOTTOMPADDING",(0,0), (-1,-1), 6),
        ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
    ]))
    return t

# ── Cover header flowable ─────────────────────────────────────────────────────
def cover_block():
    data = [[
        Paragraph("Landview Buyback System", h1),
        Paragraph("Staff User Guide", S("sub", fontSize=14, leading=18, textColor=colors.HexColor("#93c5fd"),
                                         fontName="Helvetica", spaceAfter=4)),
        Paragraph("landview-buyback.vercel.app", S("u2", fontSize=10, leading=14,
                                                    textColor=colors.HexColor("#bfdbfe"),
                                                    fontName="Helvetica-Oblique")),
    ]]
    t = Table([[col] for col in data[0]], colWidths=[PAGE_W - 2*MARGIN])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), NAVY),
        ("LEFTPADDING",   (0,0), (-1,-1), 22),
        ("RIGHTPADDING",  (0,0), (-1,-1), 22),
        ("TOPPADDING",    (0,0), (0,0),   22),
        ("BOTTOMPADDING", (0,-1),(-1,-1), 22),
        ("TOPPADDING",    (0,1), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-2), 4),
    ]))
    return t

# ── Document assembly ─────────────────────────────────────────────────────────
def build():
    doc = SimpleDocTemplate(
        "/Users/michael/Documents/Landview_buyback/Landview_Buyback_User_Guide.pdf",
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN,  bottomMargin=MARGIN + 0.5*cm,
        title="Landview Buyback – Staff User Guide",
        author="Landview",
    )

    story = []

    # ── COVER ──────────────────────────────────────────────────────────────────
    story.append(cover_block())
    story.append(Spacer(1, 0.6*cm))
    story.append(info_box([
        "📌  Official website:  <b>https://landview-buyback.vercel.app</b>",
        "📋  Client application form:  <b>https://landview-buyback.vercel.app/apply</b>",
        "🔒  Staff login:  <b>https://landview-buyback.vercel.app/login</b>  (credentials provided by your admin)",
    ]))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(
        "This guide covers everything a staff member needs to manage investments, "
        "process applications, run reports and send maturity reminders — all from "
        "the internal dashboard.",
        body_j
    ))

    # ── 1. GETTING STARTED ────────────────────────────────────────────────────
    story += section_header("1. Getting Started")
    story.append(Paragraph(
        "Your login credentials are created by your <b>Super Admin</b>. You will receive "
        "an email address and a temporary password. Visit the login page and sign in.",
        body_j
    ))
    story.append(Spacer(1, 0.25*cm))
    story.append(step_table([
        ("Receive credentials", "Your Super Admin creates your account and shares your email &amp; password."),
        ("Sign in",             "Go to <font color='#2563eb'>https://landview-buyback.vercel.app/login</font> "
                                "and enter your credentials."),
        ("Change your password","Contact your Super Admin to reset it if needed."),
    ]))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        "<b>Roles:</b> Admin staff can approve applications, edit investments and manage users. "
        "Accountants have read-only access to investments and reports.",
        note
    ))

    # ── 2. CLIENT APPLICATION PROCESS ────────────────────────────────────────
    story += section_header("2. Client Application Process")
    story.append(Paragraph(
        "Potential investors submit an online application before any investment record is created. "
        "Share the link below with them.",
        body_j
    ))
    story.append(Spacer(1, 0.2*cm))
    story.append(info_box([
        "🔗  Client application link:",
        "     <b>https://landview-buyback.vercel.app/apply</b>",
    ], bg=LGREEN, border=GREEN))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("What the client fills in:", h3))
    for item in [
        "Personal information — name, date of birth, contact details",
        "Correspondence &amp; permanent address",
        "Next-of-kin details",
        "Investment preferences — duration (6 or 12 months) and principal amount (minimum ₦1,000,000)",
        "Payment details — bank name, account number",
        "Realtor information (if applicable)",
        "Source of funds declaration and agreement to terms",
    ]:
        story.append(bullet(item))

    story.append(Spacer(1, 0.25*cm))
    story.append(Paragraph("After submitting, the client can track their application at:", body))
    story.append(Paragraph(
        "https://landview-buyback.vercel.app/application-status/&lt;their-reference&gt;",
        url_sty
    ))

    # ── 3. REVIEWING & APPROVING APPLICATIONS ────────────────────────────────
    story += section_header("3. Reviewing &amp; Approving Applications")
    story.append(step_table([
        ("Open Applications",
         "Click <b>Applications</b> in the sidebar. Pending applications show a badge count."),
        ("Review the details",
         "Click any application row to see the full submitted information — personal, investment, payment."),
        ("Approve",
         "Click <b>Approve &amp; Create Investment</b>. Confirm or adjust the plot number, "
         "transaction date, interest rate and upfront payment, then submit. "
         "An investment record is created automatically."),
        ("Reject",
         "Click <b>Reject</b> and enter an optional reason. The client will see the reason "
         "and may resubmit their application."),
    ]))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        "Once approved, the application is marked <i>Converted</i> and you are redirected "
        "straight to the new investment record.",
        note
    ))

    # ── 4. CREATING INVESTMENTS MANUALLY ─────────────────────────────────────
    story += section_header("4. Creating Investments")
    story.append(Paragraph(
        "Click <b>New Investment</b> in the sidebar. There are two ways to create a record:",
        body
    ))
    story.append(Spacer(1, 0.15*cm))

    inv_data = [
        [Paragraph("<b>Enter Manually</b>", S("im", fontSize=10, textColor=NAVY, fontName="Helvetica-Bold")),
         Paragraph("<b>Upload with AI</b>",  S("im", fontSize=10, textColor=NAVY, fontName="Helvetica-Bold"))],
        [Paragraph("Type in all fields directly.", body),
         Paragraph("Upload a scanned/PDF buyback form. AI extracts the data — review it before saving.", body)],
    ]
    t = Table(inv_data, colWidths=[(PAGE_W-2*MARGIN-0.4*cm)/2]*2)
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,0),  LBLUE),
        ("BACKGROUND",   (0,1), (-1,-1), WHITE),
        ("BOX",          (0,0), (-1,-1), 0.6, BLUE),
        ("LINEAFTER",    (0,0), (0,-1),  0.4, MGRAY),
        ("LEFTPADDING",  (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("TOPPADDING",   (0,0), (-1,-1), 8),
        ("BOTTOMPADDING",(0,0), (-1,-1), 8),
        ("VALIGN",       (0,0), (-1,-1), "TOP"),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.25*cm))

    story.append(Paragraph("Fields required for a manual investment:", h3))
    for f in [
        "Transaction Date, Duration (e.g. <i>6 months</i>)",
        "Client Name &amp; Client Email",
        "Plot Number",
        "Principal Amount (₦), Interest Rate (%), Upfront Payment (₦) — optional",
        "Realtor Name &amp; Realtor Email",
    ]:
        story.append(bullet(f))

    # ── 5. EXCEL / BULK IMPORT ────────────────────────────────────────────────
    story += section_header("5. Excel / Bulk Import")
    story.append(Paragraph(
        "Use <b>Excel Import</b> in the sidebar to upload multiple investments at once. "
        "The spreadsheet must use these exact column names (header row 1):",
        body
    ))
    story.append(Spacer(1, 0.25*cm))

    cols = [
        ("transactionDate",  "YYYY-MM-DD  e.g. 2025-01-15",     "Yes"),
        ("clientName",       "Full name  e.g. John Doe",         "Yes"),
        ("plotNumber",       "e.g. PLT-001A",                    "Yes"),
        ("duration",         "e.g. 6 months  /  12 months",      "Yes"),
        ("principal",        "Number only  e.g. 5000000",        "Yes"),
        ("interestRate",     "Number only  e.g. 20",             "Yes"),
        ("clientEmail",      "email@example.com",                "No"),
        ("realtorName",      "Full name",                        "No"),
        ("realtorEmail",     "email@example.com",                "No"),
        ("upfrontPayment",   "Number only  e.g. 200000",         "No"),
    ]
    story.append(excel_col_table(cols))
    story.append(Spacer(1, 0.2*cm))
    story.append(info_box([
        "⚠  Save the file as <b>.xlsx</b> before uploading. The system will flag any "
        "duplicate investments for your review before they are saved.",
    ], bg=LORANGE, border=ORANGE))

    # ── 6. INVESTMENTS TAB & FILTERS ─────────────────────────────────────────
    story += section_header("6. Investments Tab &amp; Filters")
    story.append(Paragraph(
        "The <b>Investments</b> page is your main registry. Use the toolbar to find records quickly.",
        body
    ))
    story.append(Spacer(1, 0.2*cm))

    filter_data = [
        [Paragraph("<b>Filter / Tool</b>", S("fh", fontSize=9, fontName="Helvetica-Bold", textColor=WHITE)),
         Paragraph("<b>What it does</b>",  S("fh", fontSize=9, fontName="Helvetica-Bold", textColor=WHITE))],
        ["Search box",    "Search by client name, plot number or email — results update instantly."],
        ["Status filter", "Filter by: All · Active · Extended · Payment Initiated · Completed."],
        ["Sort columns",  "Click any column header (Client, Plot, Principal, Maturity Date, Status) to sort ascending/descending."],
        ["Export CSV",    "Download the filtered list as a CSV file for external reporting."],
        ["Pagination",    "20 records per page; navigate with Previous / Next."],
    ]
    fd2 = []
    for i, row in enumerate(filter_data):
        if i == 0:
            fd2.append([row[0], row[1]])
        else:
            fd2.append([
                Paragraph(f"<b>{row[0]}</b>", S("fk", fontSize=9.5, textColor=NAVY, fontName="Helvetica-Bold")),
                Paragraph(row[1], S("fv", fontSize=9.5, leading=13, textColor=DGRAY)),
            ])
    avail = PAGE_W - 2*MARGIN
    ft = Table(fd2, colWidths=[avail*0.27, avail*0.73])
    ft.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  NAVY),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),  [WHITE, LGRAY]),
        ("BOX",           (0,0), (-1,-1), 0.5, MGRAY),
        ("LINEBELOW",     (0,0), (-1,-2), 0.4, MGRAY),
        ("LEFTPADDING",   (0,0), (-1,-1), 9),
        ("RIGHTPADDING",  (0,0), (-1,-1), 9),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]))
    story.append(ft)
    story.append(Spacer(1, 0.25*cm))

    story.append(Paragraph("Inside an individual investment record you can:", h3))
    for a in [
        "<b>Mark Payment Initiated</b> — signals that payout has begun.",
        "<b>Complete Payment</b> — closes the investment as fully paid out.",
        "<b>Extend</b> — add a new term; optionally set a different interest rate or partial principal.",
        "<b>Edit</b> — correct any field (admin and above).",
        "<b>View Registration</b> — if the investment came from an online application, a button "
        "appears in the sidebar linking back to the original registration form.",
    ]:
        story.append(bullet(a))

    # ── 7. MATURITY & REMINDERS ───────────────────────────────────────────────
    story += section_header("7. Maturity &amp; Reminders")
    story.append(Paragraph(
        "Click <b>Maturity &amp; Reminders</b> in the sidebar to open the dedicated reminders page.",
        body
    ))
    story.append(Spacer(1, 0.2*cm))

    story.append(Paragraph("Client Responses", h3))
    story.append(Paragraph(
        "Displays every client who has replied to a maturity reminder email. Each entry shows "
        "their stated intention (Extend · Partial Withdrawal · Full Payout) and any message they left. "
        "Click a row to open the investment record and act on their choice.",
        body_j
    ))

    story.append(Spacer(1, 0.15*cm))
    story.append(Paragraph("Sending Maturity Reminders", h3))
    story.append(Paragraph(
        "The <i>Send Maturity Reminders</i> section lists every active investment "
        "maturing within the next <b>4 weeks</b> that has a client email on file. "
        "All entries are pre-selected.",
        body_j
    ))
    story.append(Spacer(1, 0.1*cm))
    story.append(step_table([
        ("Review the list",
         "Each row shows the client name, email, plot number, maturity amount and days remaining."),
        ("Deselect if needed",
         "Click any row to uncheck a client you do not want to contact yet. "
         "Use <b>Deselect All</b> / <b>Select All</b> to manage the whole list."),
        ("Send",
         "Click <b>Send Reminders to X Clients</b>. Only the selected clients receive an email. "
         "The email contains a personal link where the client can indicate whether they want to "
         "<i>extend</i>, make a <i>partial withdrawal</i>, or receive a <i>full payout</i>."),
        ("Track responses",
         "After clients reply, their intentions appear in the <b>Client Responses</b> section above."),
    ]))
    story.append(Spacer(1, 0.2*cm))
    story.append(info_box([
        "💡  The Dashboard also shows <b>Maturing Today</b>, <b>Maturing in 7 Days</b> and "
        "<b>Maturing Next Month</b> sections for a quick at-a-glance view. "
        "Urgent overdue investments appear at the top in red.",
    ]))

    # ── FOOTER NOTE ───────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=0.8, color=MGRAY))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        "For system access issues contact your Super Admin. "
        "Official site: <font color='#2563eb'>https://landview-buyback.vercel.app</font>",
        S("foot", fontSize=8.5, leading=12, textColor=colors.HexColor("#9ca3af"), alignment=TA_CENTER)
    ))

    doc.build(story)
    print("PDF created: Landview_Buyback_User_Guide.pdf")

build()
