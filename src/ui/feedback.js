export function toast(message,{duration=2600}={}){const region=document.getElementById('toast-region');if(!region)return;const node=document.createElement('div');node.className='toast';node.textContent=message;region.append(node);setTimeout(()=>node.remove(),duration)}
export function confirmAction(message){return globalThis.confirm(message)}

