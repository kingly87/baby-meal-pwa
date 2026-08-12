import { localDateKey } from './core/dates.js';

export class AppStore {
  constructor(repository,{now=()=>new Date()}={}) {
    this.repo=repository; this.now=now; this.babies=[]; this.settings=null; this.activeBabyId=null;
    this.tasks=[]; this.allTasks=[]; this.week=null; this.weeks=[]; this.timeline=[];
  }
  get activeBaby() { return this.babies.find(baby=>baby.id===this.activeBabyId)||this.babies[0]||null; }
  async load() {
    this.babies=await this.repo.list('babies');
    this.settings=await this.repo.get('appSettings','global');
    this.activeBabyId=this.settings?.activeBabyId||this.babies[0]?.id||null;
    if(this.activeBabyId) {
      const today=localDateKey(this.now());
      this.allTasks=await this.repo.list('taskInstances',{babyId:this.activeBabyId});
      this.tasks=this.allTasks.filter(task=>task.date===today)
        .sort((a,b)=>a.plannedAt.localeCompare(b.plannedAt));
      this.weeks=(await this.repo.list('weeklyMenus',{babyId:this.activeBabyId})).sort((a,b)=>b.startDate.localeCompare(a.startDate));
      this.week=this.weeks[0]||null;
    }
    return this;
  }
  async setActiveBaby(id) {
    if(!this.babies.some(baby=>baby.id===id)) throw new Error('找不到宝宝');
    this.activeBabyId=id;
    await this.repo.put('appSettings',{id:'global',activeBabyId:id,updatedAt:new Date().toISOString()});
    return this.load();
  }
}
