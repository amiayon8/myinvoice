**Act as a Lead Frontend Developer and UI/UX Minimalist.**

Your objective is to completely redesign the main application **Sidebar Navigation**.

**CRITICAL DESIGN & UX CONSTRAINTS (The "Anti-Template" Rule):**
I want zero trace of generic, "AI-generated" dashboard aesthetics. The sidebar must be brutally practical, extremely clean, and act as a subtle, functional anchor for the application rather than a visual centerpiece.

- **Aggressive Minimalism:** Strip out heavy background gradients, drop shadows, and glowing hover states. The sidebar background should be a flat, solid color (e.g., pure white or a very subtle, stark gray). Use whitespace, not borders, to separate navigation groups.
- **Subdued Chrome:** The navigation should recede into the background, allowing the main page content to remain the focal point. Active states should be indicated by a crisp, single-color left border or a muted background fill—no glowing badges or excessive bolding.
- **Authentic Human Copy:** Eradicate generic system placeholders or overly technical labels (e.g., "System Configuration", "Data Vectors"). Use natural, direct labels (e.g., "Settings", "Members", "Invoices").
- **Clean Icons:** Use a consistent, lightweight icon set (e.g., Lucide or Heroicons outline). Do not mix solid and outline icons unless explicitly denoting an active state.

**CORE FUNCTIONALITY & STRUCTURE:**

- **Hierarchy:** Group links logically (e.g., Primary Tools, Management, Settings) with small, muted, uppercase headers that rely on spacing rather than thick lines for separation.
- **Responsive Behavior:** The sidebar should easily collapse into an icon-only state for smaller screens or when toggled, utilizing smooth but fast transitions.
- **Tech Stack:** Write the component using **Next.js** (App Router compatible) and **Tailwind CSS**.

===========================================

**Act as a Lead Frontend Developer and UI/UX Minimalist.**

Your objective is to completely redesign the **Activity Logs** page for my web application.

**CRITICAL DESIGN & UX CONSTRAINTS (The "Anti-Template" Rule):**
I want zero trace of generic, "AI-generated" admin templates. Activity logs in standard templates usually look terrible—cluttered with glowing timeline dots, unnecessary borders, and repetitive "SUCCESS" badges. This must be brutally practical, highly scannable, and strictly human-centered.

- **Aggressive Minimalism:** Strip out heavy timeline graphics, bounding boxes, and drop shadows. Use a flat, single-column layout or a highly constrained table. Rely entirely on whitespace and subtle typography contrast to separate log entries.
- **High-Signal, Low-Noise:** Do NOT use a green "Success" or "Completed" badge for normal, expected actions. Assume actions succeeded unless otherwise noted. Only use color (like subtle reds or yellows) to highlight errors, warnings, or destructive actions (e.g., "Deleted a subscription", "Failed login attempt").
- **Utilitarian Typography:** Use clean sans-serif for the action descriptions, but strictly use monospaced fonts for timestamps, IP addresses, or system IDs.
- **Logical Grouping:** Group logs naturally by relative dates (e.g., a simple, muted "Today" or "Yesterday" header) rather than showing a redundant date string on every single line.

**100% NATURAL HUMAN COPY (CRITICAL):**
Eradicate all robotic, system-generated phrasing. Logs should read like a human assistant telling you what happened.

- _Old/Robotic:_ "User authentication sequence initialized successfully." -> _New/Human:_ "Signed in."
- _Old/Robotic:_ "Entity mutation: Invoice ID #892 status updated to Remitted." -> _New/Human:_ "Marked Invoice #892 as paid."
- _Old/Robotic:_ "System generated scheduled payment link vector." -> _New/Human:_ "Created a payment link."

**CORE UI COMPONENTS TO DESIGN:**

1. **The Log Feed:** A frictionless, high-density list. Each row should clearly show: Time (monospaced), the Actor (who did it), the Action (what they did in plain English), and a subtle context link if applicable (e.g., a link to the specific invoice).
2. **Minimalist Filtering:** A simple, borderless or flat input field to search logs, and maybe a simple dropdown to filter by "Errors only" or "Specific User"—no bulky, boxed-in filter panels.
