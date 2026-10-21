# Paper design and English showcase

The design panel changes paper presentation only. Choose **Classic**, **Essential**, **Sidebar** or **Editorial**, then adjust accent color, photo visibility, font sizes, line spacing and page margins. A template applies matching font/spacing presets; subsequent adjustments remain independent of content.

**Fill one page** expands section, item and bullet spacing without changing text or font sizes. It is measured for the currently displayed language. Long content is never compressed to force one page. Extremely sparse content reaches a bounded comfortable gap and may retain white space; the panel reports that state. Turning it off restores the natural rhythm.

Template, color, photo visibility and fill intent persist per resume and through JSON. Visual PDF, PNG and image-based Word use the preview, while editable Word keeps an approximate single-column layout and respects photo visibility. Printed PDF keeps template attributes and colors; the browser's background-graphics option may matter outside the tested Chrome path.

The top-bar language button switches the **interface**. The resume-language button switches the **stored profile**. Neither calls a translation API or overwrites the other profile. The Chinese demo shows the fictional Chen Zhiyao profile; the English demo shows Emily Carter with a generated headshot. Personal or mixed identities are excluded from demo migrations.

## Design references

- [Harvard MCS](https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/): consistent hierarchy, readable whitespace and checking exported PDFs. Its guide advises omitting photos.
- [Europass](https://europass.europa.eu/en/create-europass-cv): choosing content/design, maintaining multiple versions and multilingual resumes; its current page suggests a professional photo.

The presets are original designs, not official Harvard/Europass templates. Photo conventions vary, so visibility is optional. Sidebar presentation is not a guarantee of ATS parsing.

## Validation

`npm run verify` checks formatting, syntax, lint, 16 unit tests and browser workflows. Paper coverage includes all four layouts in both languages, PNG exports and sidebar color pixels, A4 fill/overflow, real print PDF, hidden-photo editable Word, style JSON roundtrip and library-card exports without entering edit mode.
