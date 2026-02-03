# How to Extract Static Font Files from Variable Font

Since React Native doesn't support variable fonts properly, you need to extract static font files (one per weight) from your variable font file.

## Option 1: Using Python fontTools (Recommended)

1. **Install fontTools**:
   ```bash
   pip install fonttools
   ```

2. **Extract static fonts**:
   ```bash
   # Extract Regular (400)
   fonttools varLib.instancer GoogleSansFlex-Variable.ttf wght=400 --output GoogleSansFlex-Regular.ttf
   
   # Extract Medium (500)
   fonttools varLib.instancer GoogleSansFlex-Variable.ttf wght=500 --output GoogleSansFlex-Medium.ttf
   
   # Extract SemiBold (600)
   fonttools varLib.instancer GoogleSansFlex-Variable.ttf wght=600 --output GoogleSansFlex-SemiBold.ttf
   
   # Extract Bold (700)
   fonttools varLib.instancer GoogleSansFlex-Variable.ttf wght=700 --output GoogleSansFlex-Bold.ttf
   
   # Extract ExtraBold (800)
   fonttools varLib.instancer GoogleSansFlex-Variable.ttf wght=800 --output GoogleSansFlex-ExtraBold.ttf
   
   # Extract Black (900)
   fonttools varLib.instancer GoogleSansFlex-Variable.ttf wght=900 --output GoogleSansFlex-Black.ttf
   ```

## Option 2: Using FontForge (GUI Tool)

1. Download and install [FontForge](https://fontforge.org/)
2. Open your `GoogleSansFlex-Variable.ttf` file
3. For each weight you need:
   - Go to Element → Font Info → General
   - Set the Weight to the desired value (400, 500, 600, etc.)
   - Go to File → Generate Fonts
   - Save as `GoogleSansFlex-[WeightName].ttf`

## Option 3: Download Static Fonts from Google Fonts

1. Visit [Google Fonts - Google Sans Flex](https://fonts.google.com/specimen/Google+Sans+Flex)
2. Look for "Download family" or individual weight downloads
3. Download the static font files for each weight you need

## Required Files

After extraction, you should have these 6 files in `assets/fonts/`:

- `GoogleSansFlex-Regular.ttf` (weight 400)
- `GoogleSansFlex-Medium.ttf` (weight 500)
- `GoogleSansFlex-SemiBold.ttf` (weight 600)
- `GoogleSansFlex-Bold.ttf` (weight 700)
- `GoogleSansFlex-ExtraBold.ttf` (weight 800)
- `GoogleSansFlex-Black.ttf` (weight 900)

## After Adding Files

1. Restart your Expo development server
2. The fonts should now load with proper weights on all platforms

