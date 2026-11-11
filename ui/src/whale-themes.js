export const WHALE_PALETTE = {
  id:'whale',dark:true,bg:'#10182a',surface:'#19253b',panel:'#22314e',
  ink:'#f2f6ff',muted:'#aebed9',line:'#3c4e6d',primary:'#4d6bfe',
  onPrimary:'#ffffff',success:'#a4c9ff',danger:'#ffb6ae',
};
export const WHALE_COLORS={skill:'#87a4ff',plugin:'#8bd4ed',theme:'#c6d4ff',preference:'#9daec9'};
export const SWIM_CARD_THEMES=[
  {id:'whale',name:'小鲸鱼',caption:'蓝白',art:'./art/whale/deepseek-whale.svg',bg:'#4d6bfe'},
  {id:'girl',name:'鲸鱼娘',caption:'深海',art:'./art/whale-community/whale-girl-zipzippipe.png',bg:'#1c2f60',portrait:true},
];
export function readCardTheme(){try{const id=localStorage.getItem('harness-share-card-theme');return SWIM_CARD_THEMES.some(t=>t.id===id)?id:'whale';}catch{return 'whale';}}
