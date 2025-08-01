const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

class MergeCommand {
  constructor(branchToMerge) {
    if (!branchToMerge) {
      throw new Error("Branch name is required for merge.");
    }
    this.branchToMerge = branchToMerge;
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

  hashAndWriteObject(objectBuffer) {
    const hash = crypto.createHash("sha1").update(objectBuffer).digest("hex");
    const folder = hash.slice(0, 2);
    const file = hash.slice(2);
    const objectPath = path.join(this.gitPath, "objects", folder);
    if (!fs.existsSync(objectPath)) {
      fs.mkdirSync(objectPath, { recursive: true });
    }
    const compressedContent = zlib.deflateSync(objectBuffer);
    fs.writeFileSync(path.join(objectPath, file), compressedContent);
    return hash;
  }

  getCommitParents(commitSha) {
    const commitObject = this.readObject(commitSha);
    if (!commitObject) return [];
    const commitContent = commitObject
      .subarray(commitObject.indexOf(0) + 1)
      .toString();
    const parents = [];
    commitContent.split("\n").forEach((line) => {
      if (line.startsWith("parent ")) {
        parents.push(line.split(" ")[1]);
      }
    });
    return parents;
  }

  getCommitTree(commitSha) {
    const commitObject = this.readObject(commitSha);
    if (!commitObject) return null;
    const commitContent = commitObject
      .subarray(commitObject.indexOf(0) + 1)
      .toString();
    const treeLine = commitContent
      .split("\n")
      .find((l) => l.startsWith("tree "));
    return treeLine ? treeLine.split(" ")[1] : null;
  }

  getTreeFiles(treeSha) {
    const treeObject = this.readObject(treeSha);
    if (!treeObject) return [];
    const entries = [];
    let currentIndex = treeObject.indexOf(0) + 1;
    while (currentIndex < treeObject.length) {
      const spaceIndex = treeObject.indexOf(32, currentIndex);
      const nullIndex = treeObject.indexOf(0, spaceIndex);
      const name = treeObject.subarray(spaceIndex + 1, nullIndex).toString();
      const sha = treeObject
        .subarray(nullIndex + 1, nullIndex + 21)
        .toString("hex");
      entries.push({ path: name, sha: sha });
      currentIndex = nullIndex + 21;
    }
    return entries;
  }

  updateWorkspaceAndIndex(commitSha) {
    const treeSha = this.getCommitTree(commitSha);
    if (!treeSha) return;

    const files = this.getTreeFiles(treeSha);

    // Update working directory
    files.forEach((file) => {
      const blobObject = this.readObject(file.sha);
      const blobContent = blobObject.subarray(blobObject.indexOf(0) + 1);
      fs.writeFileSync(path.join(process.cwd(), file.path), blobContent);
    });

    // Update the index
    let indexContent = "";
    files.forEach((file) => {
      indexContent += `${file.path} ${file.sha}\n`;
    });
    fs.writeFileSync(path.join(this.gitPath, "index"), indexContent.trim());
  }

  // --- Core Merge Logic ---

  findMergeBase(commitA, commitB) {
    const ancestorsA = new Set();
    let q = [commitA];
    while (q.length > 0) {
      const sha = q.shift();
      if (ancestorsA.has(sha)) continue;
      ancestorsA.add(sha);
      this.getCommitParents(sha).forEach((p) => q.push(p));
    }
    q = [commitB];
    while (q.length > 0) {
      const sha = q.shift();
      if (ancestorsA.has(sha)) return sha;
      this.getCommitParents(sha).forEach((p) => q.push(p));
    }
    return null;
  }

  execute() {
    const headContent = fs
      .readFileSync(path.join(this.gitPath, "HEAD"), "utf-8")
      .trim();
    const currentBranchRef = headContent.split(" ")[1];
    const currentBranchSha = fs
      .readFileSync(path.join(this.gitPath, currentBranchRef), "utf-8")
      .trim();

    const sourceBranchPath = path.join(
      this.gitPath,
      "refs",
      "heads",
      this.branchToMerge
    );
    if (!fs.existsSync(sourceBranchPath)) {
      console.error(
        `fatal: '${this.branchToMerge}' does not point to a commit`
      );
      process.exit(128);
    }
    const sourceBranchSha = fs.readFileSync(sourceBranchPath, "utf-8").trim();

    if (currentBranchSha === sourceBranchSha) {
      console.log("Already up to date.");
      return;
    }

    const mergeBaseSha = this.findMergeBase(currentBranchSha, sourceBranchSha);

    if (mergeBaseSha === sourceBranchSha) {
      console.log("Already up to date.");
      return;
    }

    if (mergeBaseSha === currentBranchSha) {
      // Fast-forward merge
      fs.writeFileSync(
        path.join(this.gitPath, currentBranchRef),
        `${sourceBranchSha}\n`
      );
      this.updateWorkspaceAndIndex(sourceBranchSha); // <-- THE FIX
      console.log(
        `Updating ${currentBranchSha.slice(0, 7)}..${sourceBranchSha.slice(
          0,
          7
        )}`
      );
      console.log("Fast-forward");
      return;
    }

    // Three-way merge
    console.log("Performing a three-way merge...");
    const currentTreeSha = this.getCommitTree(currentBranchSha);
    const sourceTreeSha = this.getCommitTree(sourceBranchSha);

    const mergeTreeSha = sourceTreeSha;

    const message = `Merge branch '${this.branchToMerge}'`;
    const timestamp = `${Math.floor(Date.now() / 1000)} +0530`;
    const author = `John Doe <johnDoe@gmail.com> ${timestamp}`;

    const contentParts = [
      Buffer.from(`tree ${mergeTreeSha}\n`),
      Buffer.from(`parent ${currentBranchSha}\n`),
      Buffer.from(`parent ${sourceBranchSha}\n`),
      Buffer.from(`author ${author}\n`),
      Buffer.from(`committer ${author}\n`),
      Buffer.from(`\n${message}\n`),
    ];

    const commitContent = Buffer.concat(contentParts);
    const commitHeader = `commit ${commitContent.length}\0`;
    const commitObject = Buffer.concat([
      Buffer.from(commitHeader),
      commitContent,
    ]);

    const mergeCommitSha = this.hashAndWriteObject(commitObject);

    fs.writeFileSync(
      path.join(this.gitPath, currentBranchRef),
      `${mergeCommitSha}\n`
    );
    this.updateWorkspaceAndIndex(mergeCommitSha); // <-- THE FIX
    console.log(`Merge made by the 'recursive' strategy.`);
    console.log(
      `[${currentBranchRef.split("/").pop()} ${mergeCommitSha.slice(
        0,
        7
      )}] ${message}`
    );
  }
}

module.exports = MergeCommand;
