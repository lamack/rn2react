const { parse } = require('@babel/parser')
const traverse = require('@babel/traverse').default
const t = require('@babel/types')
const generator = require('@babel/generator').default
const CSSOM = require('cssom')
const { Transform } = require('stream')
const fs = require('fs')
const Path = require('path')
const transElem = (source, _src) => {
    const ast = parse(source, {
        sourceType: 'module',
        plugins: ['jsx', 'dynamicImport'] // 支持import() 动态导入语法
    })

    traverse(ast, {
        enter(path) {

            //View标签
            if (path.isJSXIdentifier({ name: "View" })) {
                path.node.name = "div";
            }

            //style属性toClass
            if (path.isJSXAttribute({ type: "JSXAttribute" })) {
                const node = path.node
                if (node.value.expression) {
                    //style为数组
                    if (node.value.expression.type === 'ArrayExpression') {
                        node.name.name = "className";
                    }
                    //style为styles.style
                    if (node.value.expression.type === 'MemberExpression') {
                        node.name.name = "className";
                    }
                }
            }

            //删除styleSheet
            if (path.isVariableDeclaration()) {
                const node = path.node
                if (
                    node.declarations
                    && node.declarations[0]
                    && node.declarations[0].id
                    && node.declarations[0].id.name === 'styles'
                    && node.declarations[0].init
                    && node.declarations[0].init.callee
                    && node.declarations[0].init.callee.object.name === "StyleSheet"
                ) {
                    const properties = path.get('declarations.0.init.arguments.0.properties')
                    const s = new CSSOM.CSSStyleSheet;
                    properties.forEach(cla => {
                        const classArr = cla.get('value.properties')
                        let str = ''
                        classArr.forEach(element => {
                            //color fontsize
                            let aname = element.node.key.name
                            let value = element.node.value.value
                            if (value) {
                                value = typeof value === 'string' && (value.includes('-') || value.includes('_')) ? `"${value}"` : value
                                aname = aname.replace(/[A-Z]/g, v => `-${v.toLowerCase()}`)
                                str += `${aname}: ${value};`
                            }
                        });
                        //styleSheet.creat转为class
                        s.insertRule(`.${cla.node.key.name} {${str}}`, 0);
                    });
                    let classContext = s.toString()
                    fs.access('./styles', fs.constants.f_OK, err => {
                        if (err) {

                        } else {

                        }
                    })
                    let dir = Path.join(process.cwd(), 'dist/styles')
                    let filePath = Path.join(dir, Path.basename(_src, Path.extname(_src))) + '.css'
                    try {
                        fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK)
                        fs.writeFileSync(filePath, classContext) //TODO: css保存路径
                    } catch (err) {
                        fs.mkdirSync(dir, { recursive: true })
                        fs.writeFileSync(filePath, classContext) //TODO: css保存路径
                    }
                    path.remove()
                }

            }
            //添加React.Fragment标签以及style标签
            if (path.isJSXOpeningElement()) {
                let node = path.node
                if (node.name && node.name.name === "ViewPort") {
                    node.name.name = "React.Fragment"
                    //生成style标签
                    // <style dangerouslySetInnerHTML={{ __html: Style }} />
                    const properties = t.objectProperty(t.identifier('__html'), t.identifier('Style'));
                    const expression = t.objectExpression([properties]);
                    const attributes = t.jsxAttribute(t.jsxIdentifier('dangerouslySetInnerHTML'), t.jsxExpressionContainer(expression))
                    const openingElement = t.jsxOpeningElement(t.jsxIdentifier('style'), [attributes], true)
                    const jsxElement = t.jsxElement(openingElement, null, [])
                    //TODO:
                    // console.log("path", path.container.children)
                    // path.insertBefore(jsxElement)
                }
            }
            if (path.isJSXClosingElement()) {
                let node = path.node
                if (node.name && node.name.name === "ViewPort") {
                    node.name.name = "React.Fragment"
                }
            }
        },
    })
    const { code } = generator(ast, {
        // retainLines: true,
    })
    return code
}


const transFn = (_src) => {
    return new Transform({
        transform: (chunk, encoding, callback) => {
            const input = chunk.toString()
            const output = transElem(input, _src)
            callback(null, output) //node模式 都是错误优先
        }
    })
}
module.exports = {
    transFn
}