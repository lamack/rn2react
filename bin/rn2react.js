#!/usr/bin/env node


const fs = require('fs')
const path = require('path')
// const async = require('neo-async')

const {
    transFn
} = require('../lib/transform')
const SOURCE_DIR = path.join(process.cwd(), 'src')
const DIST_DIR = path.join(process.cwd(), 'dist')
//先删除dist
try {
    fs.accessSync(DIST_DIR, fs.constants.R_OK | fs.constants.W_OK);
    fs.rmSync(DIST_DIR, { recursive: true })
} catch (err) { }

let fileList = [] //文件地址以队列的形式储存

const checkDirectory = (dist) => {
    try {
        fs.accessSync(dist, fs.constants.f_OK);
    } catch (err) {
        fs.mkdirSync(dist)
    }
}
const copy = (src, dist) => {
    checkDirectory(dist)
    const pathArr = fs.readdirSync(src)

    const copyFileName = element => {
        let _src = src + '/' + element
        let _dist = dist + '/' + element
        const stats = fs.statSync(_src)
        if (stats.isFile() && !_src.includes('DS_Store')) {
            fileList.push({
                _src,
                _dist
            })
        } else if (stats.isDirectory()) {
            copy(_src, _dist)
        }
    }
    pathArr.forEach(copyFileName);

    // async.forEach(pathArr,(element, done) => {
    // } ,cb)

}

//copy文件地址到队列
copy(SOURCE_DIR, DIST_DIR)

const transFile = () => {
    const { _src, _dist } = fileList.shift() || {}
    if (_src) {
        let readStream = fs.createReadStream(_src)
        let writeStream = fs.createWriteStream(_dist)
        readStream
            .pipe(transFn(_src))
            .pipe(writeStream)
        readStream.on('end', () => {
            console.log("file: transform.js ~ line 68 ~ end", _src)
            transFile()
        })
    }
}
transFile()