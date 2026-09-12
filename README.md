# Contemporary English 4B - Vocabulary Website

A complete website for dictation practice and vocabulary study for Contemporary English 4B, First Term 2027.

## Features

- **Dictation Home Page** (`index.html`) - Main landing page with quick dictation practice
- **Vocabulary List** (`vocabulary.html`) - All vocabulary organized by units and lessons, with search and filter
- **Units Overview** (`units.html`) - Summary of all 5 units with lesson breakdowns

## File Structure

```
D:\spiling\
├── index.html          # Dictation home page
├── vocabulary.html     # Complete vocabulary list
├── units.html          # Units overview
├── styles.css          # All styling
├── app.js              # Dictation practice logic
├── vocabulary.js       # Vocabulary page logic
├── units.js            # Units overview logic
├── vocab-data.js       # Vocabulary data (EDIT THIS FILE)
└── README.md           # This file
```

## Customizing Vocabulary Data

**Edit `vocab-data.js`** to replace the placeholder vocabulary with your actual data.

The data structure is:

```javascript
const vocabularyData = {
    1: {
        name: "Unit 1 Name",
        lessons: {
            1: {
                name: "Lesson 1 Name",
                words: [
                    { word: "English word", meaning: "Arabic meaning/definition" },
                    { word: "another word", meaning: "meaning" }
                ]
            },
            2: {
                name: "Lesson 2 Name",
                words: [...]
            }
            // Add more lessons as needed
        }
    },
    // Add units 2-5
};
```

### Quick Import from Excel/CSV

If you have vocabulary in Excel/CSV format:
1. Convert to JSON using an online converter or script
2. Replace the `vocabularyData` object in `vocab-data.js`
3. Ensure the structure matches the format above

### Data Format Requirements

Each vocabulary item needs:
- `word`: The English word/phrase
- `meaning`: Arabic translation or English definition

Each lesson needs:
- `name`: Lesson title
- `words`: Array of vocabulary items

Each unit needs:
- `name`: Unit title
- `lessons`: Object with lesson numbers as keys

## Opening the Website

Simply open `index.html` in any modern browser:
- Double-click `D:\spiling\index.html`
- Or use a local server: `npx serve D:\spiling` (if Node.js installed)

## Features

### Dictation Practice
- Select unit and lesson
- Words presented in random order
- Type the word you see
- Instant feedback with scoring

### Vocabulary List
- Search across all vocabulary
- Filter by unit
- Expandable/collapsible units and lessons
- Hover to see meanings

### Units Overview
- Card-based layout showing all units
- Lesson count and word count per unit
- Quick links to vocabulary pages

## Browser Support

- Chrome/Edge 80+
- Firefox 75+
- Safari 14+
- Mobile browsers

## Printing

The vocabulary pages are print-friendly:
- Navigation and controls hidden
- All units expanded
- Clean layout for study sheets

## RTL Support

The website supports RTL (right-to-left) for Arabic content via `dir="ltr"` on html tag. Change to `dir="rtl"` in HTML files if preferred.

## License

Educational use for Contemporary English 4B students.