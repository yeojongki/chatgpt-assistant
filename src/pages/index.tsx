import { Space, message, Table, Upload, UploadProps } from 'antd'
import { aoaToSheetXlsx, readerData } from '@/utils/excel'
import { InboxOutlined } from '@ant-design/icons'
// import VirtualTable from '@/components/vertual-table'
import { useState } from 'react'
import { ColumnsType } from 'antd/es/table'
import {
  addItemToTranslateHistory,
  addToTranslateHistory,
  getTranslateHistory,
} from '@/utils/storage'
import AsyncButton from '@/components/async-button'
import PromiseQueue from '@/utils/promise-queue'
const { Dragger } = Upload

interface Data {
  EN?: string
  CN: string
}

export default function Home() {
  const [allIndexMap, setAllIndexMap] = useState<Record<string, number>>({})
  const [storageHistory, setStorageHistory] = useState<Record<string, string>>(
    {},
  )
  const [excelInfo, setExcelInfo] = useState({ name: '', ext: '' })
  const [dataSource, setDataSource] = useState<Data[]>([])

  // const rowSelection = {
  //   onChange: (selectedRowKeys: React.Key[], selectedRows: Data[]) => {
  //     console.log(
  //       `selectedRowKeys: ${selectedRowKeys}`,
  //       'selectedRows: ',
  //       selectedRows,
  //     )
  //   },
  //   getCheckboxProps: (record: Data) => ({
  //     disabled: !!storageHistory[record.CN], // Column configuration not to be checked
  //   }),
  // }

  const columns: ColumnsType<any> = [
    { title: 'CN', dataIndex: 'CN' },
    { title: 'EN', dataIndex: 'EN' },
    {
      title: 'Action',
      render(value, _, index) {
        const disabled = !!value.EN || !!storageHistory[value.CN]
        return (
          <AsyncButton
            disabled={disabled}
            request={() => translateTextByIndex(value.CN, index)}
          >
            {disabled ? 'Translated' : 'Translate'}
          </AsyncButton>
        )
      },
    },
  ]

  const props: UploadProps = {
    name: 'file',
    multiple: false,
    maxCount: 1,
    accept: '.xlsx, .xls',
    onChange(info) {
      if (info.file.status !== 'uploading') {
        const nameArray = info.file.name.split('.')
        // set name
        setExcelInfo({
          name: nameArray.slice(0, nameArray.length - 1).join('.'),
          ext: nameArray[nameArray.length - 1],
        })

        const translateHistory = getTranslateHistory() || {}
        setStorageHistory(translateHistory)

        readerData<Data>(info.file.originFileObj as File).then((res) => {
          // TODO display all sheet
          const firstSheet = res[0]
          if (!firstSheet?.results.length) {
            message.error('sheet1 data is empty!')
            return
          }

          firstSheet.results = firstSheet.results.map(({ CN, EN }, index) => {
            allIndexMap[CN] = index
            return {
              CN,
              EN: EN || translateHistory[CN],
            }
          })
          setAllIndexMap({ ...allIndexMap })
          setDataSource(firstSheet.results)
        })
      }
      if (info.file.status === 'done') {
        message.success(`${info.file.name} file uploaded successfully`)
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} file upload failed.`)
      }
    },
  }

  const requestTranslate = async (text: string) => {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    const data: { result: string; error: any } = await response.json()
    if (response.status !== 200) {
      throw (
        data.error || new Error(`Request failed with status ${response.status}`)
      )
    }
    return data
  }

  const translateTextByIndex = async (text: string, index: number) => {
    try {
      const data = await requestTranslate(text)
      const EN = data.result.replace(/^\n+/, '')
      dataSource[index].EN = EN

      // update table data source & add to storage
      setDataSource([...dataSource])
      addToTranslateHistory(text, EN)
    } catch (error: any) {
      console.error(error)
      message.error(error.message)
    }
  }

  const translateTextByAll = async (textWithLineBreak: string) => {
    const CNList = textWithLineBreak.split('\n')
    const data = await requestTranslate(textWithLineBreak)
    console.log(data.result)
    const ENList = data.result.replace(/^\n+/, '').split('\n').filter(Boolean)
    ENList.forEach((item, loopIndex) => {
      const allIndex = allIndexMap[CNList[loopIndex]]
      const EN = item.replace(/^\n+/, '')
      dataSource[allIndex].EN = EN
      // add to storage
      addItemToTranslateHistory({ [CNList[loopIndex]]: item })
    })
    // update table data source
    setDataSource([...dataSource])
  }

  const buildTranslateList = (copyList: Data[], divCount: number) => {
    const result: Data[][] = []
    let temp: Data[] = []
    while (copyList.length) {
      if (temp.length === divCount) {
        result.push(temp)
        temp = []
      }
      const current = copyList.shift()!
      !current.EN && temp.push(current)
    }
    if (temp.length) {
      result.push(temp)
    }
    return result
  }

  // translate all data
  const translateAll = async (concurrency = 5, divCount = 5) => {
    const pQueue = new PromiseQueue(concurrency)
    const copyList = dataSource.slice()
    const divideList = buildTranslateList(copyList, divCount)

    divideList.forEach((arr) => {
      let text = ''
      arr.forEach((item, index) => {
        const isLast = index === arr.length - 1
        text += item.CN + (isLast ? '' : '\n')
        isLast && pQueue.add(() => translateTextByAll(text))
      })
    })
  }

  // export all data
  const exportAll = async () => {
    const data = dataSource.map((item) => {
      return Object.keys(item).map((key) => item[key as keyof typeof item])
    })
    aoaToSheetXlsx({
      data,
      header: ['CN', 'EN'],
      filename: `${excelInfo.name}-${+new Date()}.${excelInfo.ext}`,
    })
  }

  return (
    <main style={{ padding: 20 }}>
      <Dragger {...props}>
        <p className='ant-upload-drag-icon'>
          <InboxOutlined />
        </p>
        <p className='ant-upload-text'>
          Click or drag file to this area to upload
        </p>
      </Dragger>

      <Space align='center'>
        <AsyncButton
          style={{ marginTop: 30 }}
          type='primary'
          request={translateAll}
          disabled={!dataSource.length}
        >
          Translate ALL
        </AsyncButton>

        <AsyncButton
          style={{ marginTop: 30 }}
          type='primary'
          request={exportAll}
          disabled={!dataSource.length}
        >
          Export ALL
        </AsyncButton>
      </Space>

      <Table
        style={{ marginTop: 15 }}
        rowKey='CN'
        pagination={false}
        columns={columns}
        dataSource={dataSource}
        scroll={{ x: '100vw', y: 500 }}
        // rowSelection={rowSelection}
      ></Table>
    </main>
  )
}
