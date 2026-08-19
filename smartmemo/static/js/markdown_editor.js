const previewDiv = document.getElementById('preview');
const textarea = document.getElementById('memo-content');

if(!previewDiv || !textarea){
    console.warn("Markdown editor elements not found.");
}else{
    //textareaをCodeMirrorに変換
    const editor = CodeMirror.fromTextArea(textarea, {
        mode: 'markdown',
        lineNumbers: true,
        lineWrapping: true,
        theme:'monokai',
        indentUnit: 4,
        tabSize: 4,
        
        extraKeys:{
            "Tab":function(cm){
                cm.replaceSelection("    ", "end");//4スペースでインデント
                },
                "Enter":"newlineAndIndentContinueMarkdownList"}
            });
            
            editor.setSize('100%',375);//高さプレビュー欄を揃える
            //pyodideの読み込み
            let pyodideReadyPromise = null;
            async function getPyodide() {
                if (!pyodideReadyPromise) {
                    pyodideReadyPromise = loadPyodide();
                }
                return pyodideReadyPromise;
            }
            //コードブロック実行ボタンを追加する
            function attachRunButtons(container){
                const codeBlocks = container.querySelectorAll('pre code');
                
                codeBlocks.forEach(function(block){
                    if(block.dataset.runAttached)return;
                    block.dataset.runAttached = "true";
                    
                    const isPython = block.className.includes('language-python') || block.className.includes('python');
                    
                    if (!isPython) return;
                    
                    const button = document.createElement('button');
                    button.textContent = '▶ Run';
                    button.type = 'button';
                    button.className = 'btn btn-sm btn-success mb-2';
                    
                    const outputDiv = document.createElement('div');
                    outputDiv.className = 'mt-2 p-2 bg-dark text-light rounded';
                    outputDiv.style.fontFamily = 'monospace';
                    outputDiv.style.whiteSpace = 'pre-wrap';
                    outputDiv.style.display = 'none';
                    
                    button.addEventListener('click',async function(){
                        button.disabled = true;
                        button.textContent = 'Running...';
                        
                        const pyodide = await getPyodide();
                        outputDiv.style.display = 'block';
                        outputDiv.textContent = '';
                        
                        try{
                            pyodide.setStdout({
                                batched: (text) => {
                                    outputDiv.textContent += text + '\n';
                                }
                            });
                            await pyodide.runPythonAsync(block.textContent);

                            //updateOutputBlock()を呼び出す
                            updateOutputBlock(
                                editor,
                                block.textContent,
                                outputDiv.textContent
                            );
                        
                        }catch (err){
                            outputDiv.textContent += 'Error: ' + err.message + '\n';
                        }
                        //フォーム送信用に、画面に表示された実行結果を hidden input (execution-output) にセット
                        const hiddenOutput = document.getElementById("execution-output");
                        if(hiddenOutput){
                            hiddenOutput.value = outputDiv.textContent;
                        }

                        button.disabled = false;
                        button.textContent = '▶ Run';
                    });
                    block.parentNode.insertAdjacentElement('afterend',button);
                    button.insertAdjacentElement('afterend',outputDiv);
                });
            }

            function updateOutputBlock(editor,code,output){
                
                //コードブロックごとに実行管理
                const currentContent = editor.getValue();

                const codeBlock = 
                "```python\n" + 
                code.trim() + 
                "\n```";

                const outputBlock = 
                "\n\n```text\n" + 
                output.trim() +
                "\n```\n";

                const position = currentContent.indexOf(codeBlock);

                if (position === -1){
                    return;
                }

                const before = currentContent.slice(
                    0,
                    position + codeBlock.length
                );

                let after = currentContent.slice(
                    position + codeBlock.length
                    
                );
                after = after.replace(
                        /^\s*```text[\s\S]*?```\s*/,
                        ""
                    );

                const newContent = 
                before + 
                outputBlock + 
                after;

                editor.setValue(newContent);

            }

            function renderMarkdown(){
                const rawHTML = marked.parse(editor.getValue());
                previewDiv.innerHTML = DOMPurify.sanitize(rawHTML);
            }
                
            //数式のレンダリング
            function renderMath(){
                renderMathInElement(previewDiv, {
                    delimiters: [
                        {left: "$$", right: "$$", display: true},
                        {left: "$", right: "$", display: false}
                    ],
                });
            }

            function renderCodeBlocks(){
                attachRunButtons(previewDiv);//コードブロックに実行ボタンを追加
            }

            //入力のたびにプレイヤーを更新
            function updatePreview(){
                renderMarkdown();
                renderMath();
                renderCodeBlocks();
            }

            //フォーム送信前に、Codemirrorの内容をtextareaに反映

            editor.on('change',updatePreview);

            updatePreview();
            
            const form = document.querySelector('form');
            form.addEventListener('submit', ()=>{
                editor.save(); 
            
            });
            
    
}

