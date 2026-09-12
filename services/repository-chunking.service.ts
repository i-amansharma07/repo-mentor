import ts from "typescript";

import type { RepositoryFile } from "@/types/repository";
import type { DocumentChunk } from "@/types/chunk";
import type { Chunker } from "@/types/chunker";

/*
  
  createSourceFile => 
  Raw TypeScript
       │
       ▼
 TypeScript Parser
       │
       ▼
      AST
  
  */
export class TypeScriptChunker implements Chunker {
  private readonly file: RepositoryFile;
  private readonly sourceFile: ts.SourceFile;
  private chunks: DocumentChunk[] = [];

  constructor(file: RepositoryFile) {
    this.file = file;
    this.sourceFile = ts.createSourceFile(
      this.file.path,
      file.content,
      ts.ScriptTarget.Latest, //Parse this source using the latest JavaScript/TypeScript syntax you understand.
      true, //Setting it to true means TypeScript keeps parent relationships between AST nodes.
    );
  }

  private createChunk(node: ts.Node) {
    const start = this.sourceFile.getLineAndCharacterOfPosition(
      node.getStart(this.sourceFile),
    );

    const end = this.sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    const content = node.getText(this.sourceFile).trim(); //Extract the actual code

    if (!content) return;

    this.chunks.push({
      id: `${this.file.path}:${start.line + 1}-${end.line + 1}`,
      content,
      metadata: {
        path: this.file.path,
        language: this.file.language,
        startLine: start.line + 1,
        endLine: end.line + 1,
      },
    });

    /*
    
    in our vector db it will be like :
    ┌──────────────────────────────────┐
    │ embedding                        │
    │ [0.12, -0.44, ...]               │
    ├──────────────────────────────────┤
    │ content                          │
    │ async submitCode(...) {...}      │
    ├──────────────────────────────────┤
    │ metadata                         │
    │ path: submission.service.ts      │
    │ language: typescript             │
    │ startLine: 2                     │
    │ endLine: 8                       │
    └──────────────────────────────────┘
    
    */
  }

  private visit = (node: ts.Node): void => {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isClassDeclaration(node) ||
      ts.isClassExpression(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isVariableStatement(node) ||
      ts.isExportAssignment(node)
    ) {
      this.createChunk(node);
    }

    ts.forEachChild(node, this.visit);
  };

  chunk(): DocumentChunk[] {
    ts.forEachChild(this.sourceFile, this.visit);
    return [...this.chunks];
  }
}
