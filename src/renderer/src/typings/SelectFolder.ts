export type SelectFolderResult = {
  folderPath: string
  fileList: SelectFolderFile[]
}

export type SelectFolderFile = {
  fileName: string
  filePath: string
}
