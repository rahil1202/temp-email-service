export function buildEmailSrcDoc(bodyHtml: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: dark;
        font-family: ui-sans-serif, system-ui, sans-serif;
        background: #09171d;
        color: #edf7fa;
      }

      body {
        margin: 0;
        padding: 20px;
        background: #09171d;
        color: #edf7fa;
        line-height: 1.6;
        word-break: break-word;
      }

      img,
      table {
        max-width: 100%;
      }

      a {
        color: #67e7dd;
      }
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`;
}
