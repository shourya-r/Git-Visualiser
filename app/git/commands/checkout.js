const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

class CheckoutCommand {
  constructor(branchName) {
    if (!branchName) {
      throw new Error("Branch name is required for checkout.");
    }
    this.branchName = branchName;
    this.gitPath = path.join(process.cwd(), ".git");
  }

  readObject(sha) {
    const folder = sha.slice(0, 2);
    const file = sha.slice(2);
    const objectPath = path.join(this.gitPath, "objects", folder, file);
    if (!fs.existsSync(objectPath)) return null;

    const compressedContent = fs.readFileSync(objectPath);
    return zlib.inflateSync(compressedContent);
  }

  getTreeFiles(treeSha) {
    const treeObject = this.readObject(treeSha);
    if (!treeObject) return [];

    const entries = [];
    let currentIndex = treeObject.indexOf(0) + 1; // Start after the header

    while (currentIndex < treeObject.length) {
      const spaceIndex = treeObject.indexOf(32, currentIndex);
      const nullIndex = treeObject.indexOf(0, spaceIndex);

      const mode = treeObject.subarray(currentIndex, spaceIndex).toString();
      const name = treeObject.subarray(spaceIndex + 1, nullIndex).toString();
      const shaBytes = treeObject.subarray(nullIndex + 1, nullIndex + 21);
      const sha = shaBytes.toString("hex");

      if (mode === "40000") {
      } else {
        // It's a file (blob)
        entries.push({ path: name, sha: sha });
      }
      currentIndex = nullIndex + 21;
    }
    return entries;
  }

  execute() {
    const branchPath = path.join(
      this.gitPath,
      "refs",
      "heads",
      this.branchName
    );
    if (!fs.existsSync(branchPath)) {
      console.error(
        `fatal: pathspec '${this.branchName}' did not match any file(s) known to git`
      );
      process.exit(128);
    }

    // 1. Update HEAD to point to the new branch
    const newHeadContent = `ref: refs/heads/${this.branchName}`;
    fs.writeFileSync(path.join(this.gitPath, "HEAD"), newHeadContent);

    // 2. Get the commit SHA for the new branch
    const commitSha = fs.readFileSync(branchPath, "utf-8").trim();

    // 3. Get the tree SHA from the commit object
    const commitObject = this.readObject(commitSha);
    const commitContent = commitObject
      .subarray(commitObject.indexOf(0) + 1)
      .toString();
    const treeSha = commitContent.split("\n")[0].split(" ")[1];

    // 4. Get the list of all files in that tree
    const files = this.getTreeFiles(treeSha);

    // 5. Update the working directory
    // A simple implementation: overwrite files, does not handle deletions.
    files.forEach((file) => {
      const blobObject = this.readObject(file.sha);
      const blobContent = blobObject.subarray(blobObject.indexOf(0) + 1);
      fs.writeFileSync(path.join(process.cwd(), file.path), blobContent);
    });

    // 6. Update the index to match the new HEAD
    let indexContent = "";
    files.forEach((file) => {
      indexContent += `${file.path} ${file.sha}\n`;
    });
    fs.writeFileSync(path.join(this.gitPath, "index"), indexContent.trim());

    console.log(`Switched to branch '${this.branchName}'`);
  }
}

module.exports = CheckoutCommand;
