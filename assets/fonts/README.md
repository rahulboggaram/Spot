# Google Sans Flex Variable Font Setup

This directory should contain the Google Sans Flex variable font file. Follow these steps to add it:

## Step 1: Download Google Sans Flex Variable Font

1. Visit [Google Fonts](https://fonts.google.com/specimen/Google+Sans+Flex) or search for "Google Sans Flex" font
2. Download the **variable font** version (single file with all weights)
3. Look for a file named something like `GoogleSansFlex-Variable.ttf` or `GoogleSansFlex-VF.ttf`

## Step 2: Required Font File

Place the variable font file in this directory (`assets/fonts/`) with the exact name:

- `GoogleSansFlex-Variable.ttf` (or `.otf`)

**Important**: The file name must match exactly: `GoogleSansFlex-Variable.ttf`

If your downloaded file has a different name (like `GoogleSansFlex-VF.ttf`), rename it to `GoogleSansFlex-Variable.ttf`.

## Step 3: Verify Font Loading

After adding the font file:

1. Restart your Expo development server
2. The font will be loaded automatically when the app starts
3. If the font doesn't load, check the console for errors

## Benefits of Variable Fonts

- **Single file**: One file contains all font weights (400-900)
- **Smaller size**: Typically smaller than multiple static font files
- **Smooth weight transitions**: Can use any weight value between the min and max
- **Easier to manage**: Only one file to update

## Notes

- Variable fonts are supported on iOS, Android, and Web
- The `fontWeight` property in your styles will automatically use the correct weight from the variable font
- On web, Google Sans Flex may be available via Google Fonts CDN, but for mobile apps, you need to bundle the font file
- The app will fall back to system fonts if the font file is missing, but the design may look different

