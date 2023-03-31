import * as XLSX from 'xlsx'
import type { WritingOptions } from 'xlsx'

export interface ExcelData<T = any> {
  results: T[]
  meta: { sheetName: string }
}

export interface AoAToSheet<T = any> {
  data: T[][]
  header?: T[]
  filename?: string
  write2excelOpts?: WritingOptions
}

const DEF_FILE_NAME = 'excel-list.xlsx'

/**
 * @description: 获得excel数据
 */
function getExcelData(workbook: XLSX.WorkBook) {
  const excelData: ExcelData[] = []
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    let results = XLSX.utils.sheet_to_json(worksheet, {
      raw: true,
    }) as object[]

    excelData.push({
      results,
      meta: {
        sheetName,
      },
    })
  }
  return excelData
}

export function readerData<T = any>(rawFile: File) {
  return new Promise<ExcelData<T>[]>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target!.result, {
          type: 'array',
          cellDates: true,
        })
        /* DO SOMETHING WITH workbook HERE */
        const excelData = getExcelData(workbook)
        resolve(excelData)
      } catch (error) {
        reject(error)
      }
    }
    reader.readAsArrayBuffer(rawFile)
  })
}

export function aoaToSheetXlsx<T = any>({
  data,
  header,
  filename = DEF_FILE_NAME,
  write2excelOpts = { bookType: 'xlsx' },
}: AoAToSheet<T>) {
  const arrData = [...data]
  if (header) {
    arrData.unshift(header)
  }

  const worksheet = XLSX.utils.aoa_to_sheet(arrData)

  /* add worksheet to workbook */
  const workbook: XLSX.WorkBook = {
    SheetNames: [filename],
    Sheets: {
      [filename]: worksheet,
    },
  }
  /* output format determined by filename */
  XLSX.writeFile(workbook, filename, write2excelOpts)
  /* at this point, out.xlsb will have been downloaded */
}
