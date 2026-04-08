import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

const startIdx = 753; // line 754
const endIdx = 1271; // line 1272

const newContent = `          <CenterPanel
            theme={theme}
            prompt={prompt}
            uploadedImages={uploadedImages}
            isImageLoading={isImageLoading}
            imageErrorMsg={imageErrorMsg}
            generatedImage={generatedImage}
            generateImage={generateImage}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
          />`;

const newLines = [
  ...lines.slice(0, startIdx),
  newContent,
  ...lines.slice(endIdx + 1)
];

fs.writeFileSync('src/App.tsx', newLines.join('\n'));
