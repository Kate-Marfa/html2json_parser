function convertHtml2JsonAndSet() {
  const htmlTextAreaValue = document.getElementById("html").value;
  const jsonObj = html2json(htmlTextAreaValue);
  const jsonArea = document.getElementById("json");
  jsonArea.textContent = JSON.stringify(jsonObj, null, 2);
}

/* 
  Update this function to convert html into json object.
  You can rewrite it completely, just be sure it accepts htmlText as string and outputs json object.
*/
function html2json(htmlText) {
  /* A dependency-free, fault-tolerant tokenizer and tree builder. */
  try {
    const source = typeof htmlText === "string" ? htmlText : String(htmlText ?? "");
    const roots = [];
    const stack = [];
    const voidTags = new Set([
      "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
      "meta", "param", "source", "track", "wbr",
    ]);
    const rawTextTags = new Set(["script", "style", "textarea", "title"]);

    const append = (node) => {
      const parent = stack[stack.length - 1];
      if (parent) parent.children.push(node);
      else roots.push(node);
    };
    const appendText = (content) => {
      if (!content) return;
      const parent = stack[stack.length - 1];
      const siblings = parent ? parent.children : roots;
      const previous = siblings[siblings.length - 1];
      if (previous && previous.type === "text") previous.content += content;
      else siblings.push({ type: "text", content });
    };
    const isSpace = (char) => /\s/.test(char);
    const isNameStart = (char) => /[A-Za-z]/.test(char);

    const parseAttributes = (body) => {
      const attr = {};
      let position = 0;
      while (position < body.length) {
        while (position < body.length && isSpace(body[position])) position++;
        if (position >= body.length) break;
        const nameStart = position;
        while (position < body.length && !isSpace(body[position]) && body[position] !== "=") position++;
        const name = body.slice(nameStart, position);
        if (!name) { position++; continue; }
        while (position < body.length && isSpace(body[position])) position++;
        let value = true;
        if (body[position] === "=") {
          position++;
          while (position < body.length && isSpace(body[position])) position++;
          const quote = body[position];
          if (quote === "\"" || quote === "'") {
            position++;
            const valueStart = position;
            while (position < body.length && body[position] !== quote) position++;
            value = body.slice(valueStart, position);
            if (position < body.length) position++;
          } else {
            const valueStart = position;
            while (position < body.length && !isSpace(body[position])) position++;
            value = body.slice(valueStart, position);
          }
        }
        // This preserves attributes such as __proto__ as ordinary data.
        Object.defineProperty(attr, name, { value, enumerable: true, configurable: true, writable: true });
      }
      return attr;
    };

    let position = 0;
    while (position < source.length) {
      const tagStart = source.indexOf("<", position);
      if (tagStart === -1) { appendText(source.slice(position)); break; }
      if (tagStart > position) appendText(source.slice(position, tagStart));

      // Comments and declarations are deliberately ignored: the requested schema has no such node.
      if (source.startsWith("<!--", tagStart)) {
        const commentEnd = source.indexOf("-->", tagStart + 4);
        position = commentEnd === -1 ? source.length : commentEnd + 3;
        continue;
      }
      if (source.startsWith("<!", tagStart) || source.startsWith("<?", tagStart)) {
        const declarationEnd = source.indexOf(">", tagStart + 2);
        position = declarationEnd === -1 ? source.length : declarationEnd + 1;
        continue;
      }

      let cursor = tagStart + 1;
      let isClosing = false;
      if (source[cursor] === "/") { isClosing = true; cursor++; }
      while (cursor < source.length && isSpace(source[cursor])) cursor++;
      if (!isNameStart(source[cursor])) {
        appendText("<");
        position = tagStart + 1;
        continue;
      }
      const nameStart = cursor;
      while (cursor < source.length && !isSpace(source[cursor]) && source[cursor] !== "/" && source[cursor] !== ">") cursor++;
      const tag = source.slice(nameStart, cursor).toLowerCase();

      let quote = "";
      let tagEnd = cursor;
      for (; tagEnd < source.length; tagEnd++) {
        const char = source[tagEnd];
        if (quote) {
          if (char === quote) quote = "";
        } else if (char === "\"" || char === "'") quote = char;
        else if (char === ">") break;
      }
      if (tagEnd >= source.length) { appendText(source.slice(tagStart)); break; }

      if (isClosing) {
        // Closing a parent also closes malformed, unclosed descendants.
        for (let level = stack.length - 1; level >= 0; level--) {
          if (stack[level].tag === tag) { stack.length = level; break; }
        }
        position = tagEnd + 1;
        continue;
      }

      let attributesText = source.slice(cursor, tagEnd);
      const selfClosing = /\/\s*$/.test(attributesText);
      if (selfClosing) attributesText = attributesText.replace(/\/\s*$/, "");
      const node = { tag, attr: parseAttributes(attributesText), children: [] };
      append(node);
      position = tagEnd + 1;
      if (voidTags.has(tag) || selfClosing) continue;
      stack.push(node);

      // Raw-text elements cannot mistake '<' in their contents for a child tag.
      if (rawTextTags.has(tag)) {
        const closePattern = new RegExp("</\\s*" + tag + "\\s*>", "i");
        const remaining = source.slice(position);
        const match = closePattern.exec(remaining);
        if (match) {
          appendText(remaining.slice(0, match.index));
          stack.pop();
          position += match.index + match[0].length;
        } else {
          appendText(remaining);
          position = source.length;
        }
      }
    }
    return roots.length === 1 ? roots[0] : roots;
  } catch (_) {
    // Never let unusual non-string input or hostile markup escape as an exception.
    return [];
  }
}

function showExample1() {
  const htmlExample = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport">
    <title>Sample HTML</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Welcome to My Website</h1>
    </header>
    <nav>
        <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
        </ul>
    </nav>
    <main>
        <section id="home">
            <h2>Home Section</h2>
            <p>This is the home section of the webpage.</p>
        </section>
        <section id="about">
            <h2>About Section</h2>
            <p>This is the about section of the webpage.</p>
        </section>
    </main>
    <footer>
        <p>&copy; 2024 My Website</p>
    </footer>
    <script src="script.js"></script>
</body>
</html>
`;
  const jsonContent = {
    "Comment 1":
      "You have to think about how to take into account various html inputs so your json structure will cover them all and handle different cases.",
    "Comment 2":
      "When you make any choice in terms of selecting specific json structure for conversion - be ready to provide reasoning behind such choice.",
  };

  document.getElementById("html").value = htmlExample;
  document.getElementById("json").textContent = JSON.stringify(
    jsonContent,
    null,
    2
  );
}

function showExample2() {
  const htmlExample = `<div>
<p>Hello world!</p>
  <button>Click me!</button>
  <textarea>Some very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very long string.</textarea>
</div>
`;
  const jsonContent = {
    "Comment 1":
      "You have to think about how to take into account various html inputs so your json structure will cover them all and handle different cases.",
    "Comment 2":
      "When you make any choice in terms of selecting specific json structure for conversion - be ready to provide reasoning behind such choice.",
  };

  document.getElementById("html").value = htmlExample;
  document.getElementById("json").textContent = JSON.stringify(
    jsonContent,
    null,
    2
  );
}
