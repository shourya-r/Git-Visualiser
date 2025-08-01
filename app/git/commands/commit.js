const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

class CommitCommand {
  constructor(message) {
    if (!message) {
      throw new Error("Commit message is required.");
    }
    this.message = message;
    this.gitPath = path.join(process.cwd(), ".git");
    this.indexPath = path.join(this.gitPath, "index");
  }

  hashAndWriteObject(objectBuffer) {
    const hash = crypto.createHash("sha1").update(objectBuffer).digest("hex");
    const folder = hash.slice(0, 2);
    const file = hash.slice(2);
    const folderPath = path.join(this.gitPath, "objects", folder);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const compressedContent = zlib.deflateSync(objectBuffer);
    fs.writeFileSync(path.join(folderPath, file), compressedContent);
    return hash;
  }

  readIndex() {
    const indexEntries = new Map();
    if (fs.existsSync(this.indexPath)) {
      const indexContent = fs.readFileSync(this.indexPath, "utf-8");
      const lines = indexContent
        .split("\n")
        .filter((line) => line.trim() !== "");
      for (const line of lines) {
        const [path, sha] = line.split(" ");
        indexEntries.set(path, sha);
      }
    }
    return indexEntries;
  }

  writeTreeFromIndex(indexEntries) {
    const treeEntries = [];
    for (const [filepath, sha] of indexEntries.entries()) {
      treeEntries.push({
        mode: "100644", // Regular file mode
        name: path.basename(filepath),
        sha: sha,
      });
    }

    // Git requires tree entries to be sorted by name.
    treeEntries.sort((a, b) => a.name.localeCompare(b.name));

    const treeData = treeEntries.reduce((acc, entry) => {
      const shaBuffer = Buffer.from(entry.sha, "hex");
      return Buffer.concat([
        acc,
        Buffer.from(`${entry.mode} ${entry.name}\0`),
        shaBuffer,
      ]);
    }, Buffer.alloc(0));

    const treeHeader = `tree ${treeData.length}\0`;
    const treeObject = Buffer.concat([Buffer.from(treeHeader), treeData]);

    return this.hashAndWriteObject(treeObject);
  }

  getParentCommit() {
    const headContent = fs
      .readFileSync(path.join(this.gitPath, "HEAD"), "utf-8")
      .trim();
    // e.g., "ref: refs/heads/main"
    const refPath = headContent.split(" ")[1];
    if (!refPath) return null;

    const fullRefPath = path.join(this.gitPath, refPath);

    if (fs.existsSync(fullRefPath)) {
      return fs.readFileSync(fullRefPath, "utf-8").trim();
    }
    return null; // No parent, this is the first commit
  }

  execute() {
    const indexEntries = this.readIndex();
    if (indexEntries.size === 0) {
      console.log("Nothing to commit, working tree clean");
      return;
    }

    // Step 1: Create a tree object using the logic from 'write-tree'
    const treeSha = this.writeTreeFromIndex(indexEntries);

    // Step 2: Determine the parent commit
    const parentSha = this.getParentCommit();

    // Step 3: Create the commit object using the logic from 'commit-tree'
    const timestamp = `${Math.floor(Date.now() / 1000)} +0530`;
    const author = `John Doe <johnDoe@gmail.com> ${timestamp}`;

    const contentParts = [];
    contentParts.push(Buffer.from(`tree ${treeSha}\n`));
    if (parentSha) {
      contentParts.push(Buffer.from(`parent ${parentSha}\n`));
    }
    contentParts.push(Buffer.from(`author ${author}\n`));
    contentParts.push(Buffer.from(`committer ${author}\n`)); // Simple case: author is committer
    contentParts.push(Buffer.from(`\n${this.message}\n`));

    const commitContent = Buffer.concat(contentParts);
    const commitHeader = `commit ${commitContent.length}\0`;
    const commitObject = Buffer.concat([
      Buffer.from(commitHeader),
      commitContent,
    ]);

    const commitSha = this.hashAndWriteObject(commitObject);

    // Step 4: Update the current branch to point to the new commit
    const headContent = fs
      .readFileSync(path.join(this.gitPath, "HEAD"), "utf-8")
      .trim();
    const refPath = headContent.split(" ")[1];
    fs.writeFileSync(path.join(this.gitPath, refPath), `${commitSha}\n`);

    console.log(
      `[${refPath.split("/").pop()} ${commitSha.slice(0, 7)}] ${this.message}`
    );
  }
}

module.exports = CommitCommand;
