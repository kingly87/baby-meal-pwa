import { localDateKey } from './core/dates.js';

export class AppStore {
  constructor(repository,{now=()=>new Date()}={}) {
    this.repo=repository; this.now=now; this.babies=[]; this.activeBabyId=null;
    this.tasks=[]; this.week=null; this.timeline=[];
  }
  get activeBaby() { return this.babies.find(baby=>baby.id===this.activeBabyId)||this.babies[0]||null; }
  async load() {
    this.babies=await this.repo.list('babies');
    const setting=await this.repo.get('appSettings','global');
    this.activeBabyId=setting?.activeBabyId||this.babies[0]?.id||null;
    if(this.activeBabyId) {
      const today=localDateKey(this.now());
      this.tasks=(await this.repo.list('taskInstances',{babyId:this.activeBabyId}))
        .filter(task=>task.date===today)
        .sort((a,b)=>a.plannedAt.localeCompare(b.plannedAt));
      this.week=(await this.repo.list('weeklyMenus',{babyId:this.activeBabyId}))
        .sort((a,b)=>b.startDate.localeCompare(a.startDate))[0]||null;
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
