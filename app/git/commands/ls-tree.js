const path = require("path");
const fs = require("fs");
const zlib = require("zlib");

class LSTreeCommand {
  constructor(flag, commitSHA) {
    this.flag = flag;
    this.commitSHA = commitSHA;
  }

  execute() {
    const { flag, commitSHA: initialSha } = this;

    // For now, we only support --name-only or no flag.
    if (flag && flag !== "--name-only") {
      console.error(`fatal: unknown option '${flag}'`);
      process.exit(129);
    }

    // 1. Read the initial object provided by the user
    let folder = initialSha.slice(0, 2);
    let file = initialSha.slice(2);
    let filePath = path.join(process.cwd(), ".git", "objects", folder, file);

    if (!fs.existsSync(filePath)) {
      console.error(`fatal: not a valid object name ${initialSha}`);
      process.exit(128);
    }

    let fileContent = fs.readFileSync(filePath);
    let decompressedContent = zlib.inflateSync(fileContent);

    // 2. Check the object's type (commit, tree, etc.)
    const headerEnd = decompressedContent.indexOf(0);
    const header = decompressedContent.subarray(0, headerEnd).toString();
    const [type] = header.split(" ");

    let treeData;

    if (type === "commit") {
      // 3a. If it's a commit, parse it to find the tree SHA
      const commitBody = decompressedContent.subarray(headerEnd + 1).toString();
      const treeLine = commitBody
        .split("\n")
        .find((line) => line.startsWith("tree "));
      if (!treeLine) {
        console.error(`fatal: could not find tree in commit ${initialSha}`);
        process.exit(128);
      }
      const treeSha = treeLine.split(" ")[1];

      // Now, read the actual tree object using the found SHA
      folder = treeSha.slice(0, 2);
      file = treeSha.slice(2);
      filePath = path.join(process.cwd(), ".git", "objects", folder, file);

      if (!fs.existsSync(filePath)) {
        console.error(
          `fatal: tree ${treeSha} not found for commit ${initialSha}`
        );
        process.exit(128);
      }

      fileContent = fs.readFileSync(filePath);
      const decompressedTree = zlib.inflateSync(fileContent);
      const treeHeaderEnd = decompressedTree.indexOf(0);
      treeData = decompressedTree.subarray(treeHeaderEnd + 1);
    } else if (type === "tree") {
      // 3b. If it's already a tree, just get its data part
      treeData = decompressedContent.subarray(headerEnd + 1);
    } else {
      console.error(`fatal: ${initialSha} is not a commit or a tree object`);
      process.exit(128);
    }

    // 4. Your original parsing logic now runs on the correct tree data
    const entries = [];
    let currentIndex = 0;

    while (currentIndex < treeData.length) {
      const spaceIndex = treeData.indexOf(32, currentIndex); // 32 is ASCII for space
      if (spaceIndex === -1) {
        break;
      }
      const nullIndex = treeData.indexOf(0, spaceIndex);
      if (nullIndex === -1) {
        break;
      }

      const mode = treeData.subarray(currentIndex, spaceIndex).toString();
      const filename = treeData.subarray(spaceIndex + 1, nullIndex).toString();
      const shaBytes = treeData.subarray(nullIndex + 1, nullIndex + 1 + 20);
      const shaHex = shaBytes.toString("hex");

      const objectType = mode === "40000" ? "tree" : "blob";

      entries.push({ mode, type: objectType, sha: shaHex, filename });

      // Move cursor past the filename, null byte, and the 20-byte SHA hash
      currentIndex = nullIndex + 1 + 20;
    }

    if (flag === "--name-only") {
      console.log(entries.map((e) => e.filename).join("\n"));
    } else {
      const output = entries
        .map((e) => `${e.mode} ${e.type} ${e.sha}\t${e.filename}`)
        .join("\n");
      console.log(output);
    }
  }
}

module.exports = LSTreeCommand;
