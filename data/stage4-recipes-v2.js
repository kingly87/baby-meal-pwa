const ADDITIONAL_ROWS=`
stage4-v2-001|牛肉胡萝卜蒸软手指蔬菜|手指蔬菜|牛肉|牛肉|胡萝卜|蒸软手指蔬菜|手指条|beginner-chewing|true|加餐|方法01
stage4-v2-002|鸡腿肉西兰花蒸软手指蔬菜|手指蔬菜|鸡肉|鸡腿肉|西兰花|蒸软手指蔬菜|手指条|beginner-chewing|true|加餐|方法02
stage4-v2-003|猪里脊南瓜蒸软手指蔬菜|手指蔬菜|猪肉|猪里脊|南瓜|蒸软手指蔬菜|手指条|beginner-chewing|true|加餐|方法03
stage4-v2-004|鳕鱼菠菜蒸软手指蔬菜|手指蔬菜|鱼|鳕鱼|菠菜|蒸软手指蔬菜|手指条|beginner-chewing|true|加餐|方法04
stage4-v2-005|鲈鱼土豆蒸软手指蔬菜|手指蔬菜|鱼|鲈鱼|土豆|蒸软手指蔬菜|手指条|beginner-chewing|true|加餐|方法05
stage4-v2-006|三文鱼丝瓜蒸软手指蔬菜|手指蔬菜|鱼|三文鱼|丝瓜|蒸软手指蔬菜|手指条|beginner-chewing|true|加餐|方法06
stage4-v2-007|虾仁油麦菜蒸软手指蔬菜|手指蔬菜|虾|虾仁|油麦菜|蒸软手指蔬菜|手指条|beginner-chewing|true|加餐|方法07
stage4-v2-008|嫩豆腐香菇蒸软手指蔬菜|手指蔬菜|豆腐|嫩豆腐|香菇|蒸软手指蔬菜|手指条|beginner-chewing|true|加餐|方法08
stage4-v2-009|鸡蛋番茄蒸软手指蔬菜|手指蔬菜|蛋|鸡蛋|番茄|蒸软手指蔬菜|手指条|beginner-chewing|true|加餐|方法09
stage4-v2-010|豆腐莴笋蒸软手指蔬菜|手指蔬菜|豆腐|豆腐|莴笋|蒸软手指蔬菜|手指条|beginner-chewing|true|加餐|方法10
stage4-v2-011|鸡胸肉西葫芦蒸软手指蔬菜|手指蔬菜|鸡肉|鸡胸肉|西葫芦|蒸软手指蔬菜|手指条|beginner-chewing|true|加餐|方法11
stage4-v2-012|猪肉红薯蒸软手指蔬菜|手指蔬菜|猪肉|猪肉|红薯|蒸软手指蔬菜|手指条|beginner-chewing|true|加餐|方法12
stage4-v2-013|牛肉胡萝卜杂蔬蒸糕|蒸糕|牛肉|牛肉|胡萝卜|杂蔬蒸糕|蒸糕|beginner-chewing|true|早餐|方法01
stage4-v2-014|鸡腿肉西兰花杂蔬蒸糕|蒸糕|鸡肉|鸡腿肉|西兰花|杂蔬蒸糕|蒸糕|beginner-chewing|true|早餐|方法02
stage4-v2-015|猪里脊南瓜杂蔬蒸糕|蒸糕|猪肉|猪里脊|南瓜|杂蔬蒸糕|蒸糕|beginner-chewing|true|早餐|方法03
stage4-v2-016|鳕鱼菠菜杂蔬蒸糕|蒸糕|鱼|鳕鱼|菠菜|杂蔬蒸糕|蒸糕|beginner-chewing|true|早餐|方法04
stage4-v2-017|鲈鱼土豆杂蔬蒸糕|蒸糕|鱼|鲈鱼|土豆|杂蔬蒸糕|蒸糕|beginner-chewing|true|早餐|方法05
stage4-v2-018|三文鱼丝瓜杂蔬蒸糕|蒸糕|鱼|三文鱼|丝瓜|杂蔬蒸糕|蒸糕|beginner-chewing|true|早餐|方法06
stage4-v2-019|虾仁油麦菜杂蔬蒸糕|蒸糕|虾|虾仁|油麦菜|杂蔬蒸糕|蒸糕|beginner-chewing|true|早餐|方法07
stage4-v2-020|嫩豆腐香菇杂蔬蒸糕|蒸糕|豆腐|嫩豆腐|香菇|杂蔬蒸糕|蒸糕|beginner-chewing|true|早餐|方法08
stage4-v2-021|鸡蛋番茄杂蔬蒸糕|蒸糕|蛋|鸡蛋|番茄|杂蔬蒸糕|蒸糕|beginner-chewing|true|早餐|方法09
stage4-v2-022|豆腐莴笋杂蔬蒸糕|蒸糕|豆腐|豆腐|莴笋|杂蔬蒸糕|蒸糕|beginner-chewing|true|早餐|方法10
stage4-v2-023|鸡胸肉西葫芦杂蔬蒸糕|蒸糕|鸡肉|鸡胸肉|西葫芦|杂蔬蒸糕|蒸糕|beginner-chewing|true|早餐|方法11
stage4-v2-024|猪肉红薯杂蔬蒸糕|蒸糕|猪肉|猪肉|红薯|杂蔬蒸糕|蒸糕|beginner-chewing|true|早餐|方法12
stage4-v2-025|牛肉胡萝卜谷物软饼|软饼|牛肉|牛肉|胡萝卜|谷物软饼|软饼|beginner-chewing|true|早餐|方法01
stage4-v2-026|鸡腿肉西兰花谷物软饼|软饼|鸡肉|鸡腿肉|西兰花|谷物软饼|软饼|beginner-chewing|true|早餐|方法02
stage4-v2-027|猪里脊南瓜谷物软饼|软饼|猪肉|猪里脊|南瓜|谷物软饼|软饼|beginner-chewing|true|早餐|方法03
stage4-v2-028|鳕鱼菠菜谷物软饼|软饼|鱼|鳕鱼|菠菜|谷物软饼|软饼|beginner-chewing|true|早餐|方法04
stage4-v2-029|鲈鱼土豆谷物软饼|软饼|鱼|鲈鱼|土豆|谷物软饼|软饼|beginner-chewing|true|早餐|方法05
stage4-v2-030|三文鱼丝瓜谷物软饼|软饼|鱼|三文鱼|丝瓜|谷物软饼|软饼|beginner-chewing|true|早餐|方法06
stage4-v2-031|虾仁油麦菜谷物软饼|软饼|虾|虾仁|油麦菜|谷物软饼|软饼|beginner-chewing|true|早餐|方法07
stage4-v2-032|嫩豆腐香菇谷物软饼|软饼|豆腐|嫩豆腐|香菇|谷物软饼|软饼|beginner-chewing|true|早餐|方法08
stage4-v2-033|鸡蛋番茄谷物软饼|软饼|蛋|鸡蛋|番茄|谷物软饼|软饼|beginner-chewing|true|早餐|方法09
stage4-v2-034|豆腐莴笋谷物软饼|软饼|豆腐|豆腐|莴笋|谷物软饼|软饼|beginner-chewing|true|早餐|方法10
stage4-v2-035|鸡胸肉西葫芦谷物软饼|软饼|鸡肉|鸡胸肉|西葫芦|谷物软饼|软饼|beginner-chewing|true|早餐|方法11
stage4-v2-036|猪肉红薯谷物软饼|软饼|猪肉|猪肉|红薯|谷物软饼|软饼|beginner-chewing|true|早餐|方法12
stage4-v2-037|牛肉胡萝卜软米饭团|饭团|牛肉|牛肉|胡萝卜|软米饭团|饭团|advanced-chewing|true|正餐|方法01
stage4-v2-038|鸡腿肉西兰花软米饭团|饭团|鸡肉|鸡腿肉|西兰花|软米饭团|饭团|advanced-chewing|true|正餐|方法02
stage4-v2-039|猪里脊南瓜软米饭团|饭团|猪肉|猪里脊|南瓜|软米饭团|饭团|advanced-chewing|true|正餐|方法03
stage4-v2-040|鳕鱼菠菜软米饭团|饭团|鱼|鳕鱼|菠菜|软米饭团|饭团|advanced-chewing|true|正餐|方法04
stage4-v2-041|鲈鱼土豆软米饭团|饭团|鱼|鲈鱼|土豆|软米饭团|饭团|advanced-chewing|true|正餐|方法05
stage4-v2-042|三文鱼丝瓜软米饭团|饭团|鱼|三文鱼|丝瓜|软米饭团|饭团|advanced-chewing|true|正餐|方法06
stage4-v2-043|虾仁油麦菜软米饭团|饭团|虾|虾仁|油麦菜|软米饭团|饭团|advanced-chewing|true|正餐|方法07
stage4-v2-044|嫩豆腐香菇软米饭团|饭团|豆腐|嫩豆腐|香菇|软米饭团|饭团|advanced-chewing|true|正餐|方法08
stage4-v2-045|鸡蛋番茄软米饭团|饭团|蛋|鸡蛋|番茄|软米饭团|饭团|advanced-chewing|true|正餐|方法09
stage4-v2-046|豆腐莴笋软米饭团|饭团|豆腐|豆腐|莴笋|软米饭团|饭团|advanced-chewing|true|正餐|方法10
stage4-v2-047|鸡胸肉西葫芦软米饭团|饭团|鸡肉|鸡胸肉|西葫芦|软米饭团|饭团|advanced-chewing|true|正餐|方法11
stage4-v2-048|猪肉红薯软米饭团|饭团|猪肉|猪肉|红薯|软米饭团|饭团|advanced-chewing|true|正餐|方法12
stage4-v2-049|牛肉胡萝卜碎软面|面|牛肉|牛肉|胡萝卜|碎软面|面条|beginner-chewing|false|正餐|方法01
stage4-v2-050|鸡腿肉西兰花碎软面|面|鸡肉|鸡腿肉|西兰花|碎软面|面条|beginner-chewing|false|正餐|方法02
stage4-v2-051|猪里脊南瓜碎软面|面|猪肉|猪里脊|南瓜|碎软面|面条|beginner-chewing|false|正餐|方法03
stage4-v2-052|鳕鱼菠菜碎软面|面|鱼|鳕鱼|菠菜|碎软面|面条|beginner-chewing|false|正餐|方法04
stage4-v2-053|鲈鱼土豆碎软面|面|鱼|鲈鱼|土豆|碎软面|面条|beginner-chewing|false|正餐|方法05
stage4-v2-054|三文鱼丝瓜碎软面|面|鱼|三文鱼|丝瓜|碎软面|面条|beginner-chewing|false|正餐|方法06
stage4-v2-055|虾仁油麦菜碎软面|面|虾|虾仁|油麦菜|碎软面|面条|beginner-chewing|false|正餐|方法07
stage4-v2-056|嫩豆腐香菇碎软面|面|豆腐|嫩豆腐|香菇|碎软面|面条|beginner-chewing|false|正餐|方法08
stage4-v2-057|鸡蛋番茄碎软面|面|蛋|鸡蛋|番茄|碎软面|面条|beginner-chewing|false|正餐|方法09
stage4-v2-058|豆腐莴笋碎软面|面|豆腐|豆腐|莴笋|碎软面|面条|beginner-chewing|false|正餐|方法10
stage4-v2-059|鸡胸肉西葫芦碎软面|面|鸡肉|鸡胸肉|西葫芦|碎软面|面条|beginner-chewing|false|正餐|方法11
stage4-v2-060|猪肉红薯碎软面|面|猪肉|猪肉|红薯|碎软面|面条|beginner-chewing|false|正餐|方法12
stage4-v2-061|牛肉胡萝卜软煮意面|意面|牛肉|牛肉|胡萝卜|软煮意面|意面|advanced-chewing|false|正餐|方法01
stage4-v2-062|鸡腿肉西兰花软煮意面|意面|鸡肉|鸡腿肉|西兰花|软煮意面|意面|advanced-chewing|false|正餐|方法02
stage4-v2-063|猪里脊南瓜软煮意面|意面|猪肉|猪里脊|南瓜|软煮意面|意面|advanced-chewing|false|正餐|方法03
stage4-v2-064|鳕鱼菠菜软煮意面|意面|鱼|鳕鱼|菠菜|软煮意面|意面|advanced-chewing|false|正餐|方法04
stage4-v2-065|鲈鱼土豆软煮意面|意面|鱼|鲈鱼|土豆|软煮意面|意面|advanced-chewing|false|正餐|方法05
stage4-v2-066|三文鱼丝瓜软煮意面|意面|鱼|三文鱼|丝瓜|软煮意面|意面|advanced-chewing|false|正餐|方法06
stage4-v2-067|虾仁油麦菜软煮意面|意面|虾|虾仁|油麦菜|软煮意面|意面|advanced-chewing|false|正餐|方法07
stage4-v2-068|嫩豆腐香菇软煮意面|意面|豆腐|嫩豆腐|香菇|软煮意面|意面|advanced-chewing|false|正餐|方法08
stage4-v2-069|鸡蛋番茄软煮意面|意面|蛋|鸡蛋|番茄|软煮意面|意面|advanced-chewing|false|正餐|方法09
stage4-v2-070|豆腐莴笋软煮意面|意面|豆腐|豆腐|莴笋|软煮意面|意面|advanced-chewing|false|正餐|方法10
stage4-v2-071|鸡胸肉西葫芦软煮意面|意面|鸡肉|鸡胸肉|西葫芦|软煮意面|意面|advanced-chewing|false|正餐|方法11
stage4-v2-072|猪肉红薯软煮意面|意面|猪肉|猪肉|红薯|软煮意面|意面|advanced-chewing|false|正餐|方法12
stage4-v2-073|牛肉胡萝卜薄皮软饺子|饺子|牛肉|牛肉|胡萝卜|薄皮软饺子|饺子|advanced-chewing|true|正餐|方法01
stage4-v2-074|鸡腿肉西兰花薄皮软饺子|饺子|鸡肉|鸡腿肉|西兰花|薄皮软饺子|饺子|advanced-chewing|true|正餐|方法02
stage4-v2-075|猪里脊南瓜薄皮软饺子|饺子|猪肉|猪里脊|南瓜|薄皮软饺子|饺子|advanced-chewing|true|正餐|方法03
stage4-v2-076|鳕鱼菠菜薄皮软饺子|饺子|鱼|鳕鱼|菠菜|薄皮软饺子|饺子|advanced-chewing|true|正餐|方法04
stage4-v2-077|鲈鱼土豆薄皮软饺子|饺子|鱼|鲈鱼|土豆|薄皮软饺子|饺子|advanced-chewing|true|正餐|方法05
stage4-v2-078|三文鱼丝瓜薄皮软饺子|饺子|鱼|三文鱼|丝瓜|薄皮软饺子|饺子|advanced-chewing|true|正餐|方法06
stage4-v2-079|虾仁油麦菜薄皮软饺子|饺子|虾|虾仁|油麦菜|薄皮软饺子|饺子|advanced-chewing|true|正餐|方法07
stage4-v2-080|嫩豆腐香菇薄皮软饺子|饺子|豆腐|嫩豆腐|香菇|薄皮软饺子|饺子|advanced-chewing|true|正餐|方法08
stage4-v2-081|鸡蛋番茄薄皮软饺子|饺子|蛋|鸡蛋|番茄|薄皮软饺子|饺子|advanced-chewing|true|正餐|方法09
stage4-v2-082|豆腐莴笋薄皮软饺子|饺子|豆腐|豆腐|莴笋|薄皮软饺子|饺子|advanced-chewing|true|正餐|方法10
stage4-v2-083|鸡胸肉西葫芦薄皮软饺子|饺子|鸡肉|鸡胸肉|西葫芦|薄皮软饺子|饺子|advanced-chewing|true|正餐|方法11
stage4-v2-084|猪肉红薯薄皮软饺子|饺子|猪肉|猪肉|红薯|薄皮软饺子|饺子|advanced-chewing|true|正餐|方法12
stage4-v2-085|牛肉胡萝卜薄皮小馄饨|馄饨|牛肉|牛肉|胡萝卜|薄皮小馄饨|馄饨|advanced-chewing|false|正餐|方法01
stage4-v2-086|鸡腿肉西兰花薄皮小馄饨|馄饨|鸡肉|鸡腿肉|西兰花|薄皮小馄饨|馄饨|advanced-chewing|false|正餐|方法02
stage4-v2-087|猪里脊南瓜薄皮小馄饨|馄饨|猪肉|猪里脊|南瓜|薄皮小馄饨|馄饨|advanced-chewing|false|正餐|方法03
stage4-v2-088|鳕鱼菠菜薄皮小馄饨|馄饨|鱼|鳕鱼|菠菜|薄皮小馄饨|馄饨|advanced-chewing|false|正餐|方法04
stage4-v2-089|鲈鱼土豆薄皮小馄饨|馄饨|鱼|鲈鱼|土豆|薄皮小馄饨|馄饨|advanced-chewing|false|正餐|方法05
stage4-v2-090|三文鱼丝瓜薄皮小馄饨|馄饨|鱼|三文鱼|丝瓜|薄皮小馄饨|馄饨|advanced-chewing|false|正餐|方法06
stage4-v2-091|虾仁油麦菜薄皮小馄饨|馄饨|虾|虾仁|油麦菜|薄皮小馄饨|馄饨|advanced-chewing|false|正餐|方法07
stage4-v2-092|嫩豆腐香菇薄皮小馄饨|馄饨|豆腐|嫩豆腐|香菇|薄皮小馄饨|馄饨|advanced-chewing|false|正餐|方法08
stage4-v2-093|鸡蛋番茄薄皮小馄饨|馄饨|蛋|鸡蛋|番茄|薄皮小馄饨|馄饨|advanced-chewing|false|正餐|方法09
stage4-v2-094|豆腐莴笋薄皮小馄饨|馄饨|豆腐|豆腐|莴笋|薄皮小馄饨|馄饨|advanced-chewing|false|正餐|方法10
stage4-v2-095|鸡胸肉西葫芦薄皮小馄饨|馄饨|鸡肉|鸡胸肉|西葫芦|薄皮小馄饨|馄饨|advanced-chewing|false|正餐|方法11
stage4-v2-096|猪肉红薯薄皮小馄饨|馄饨|猪肉|猪肉|红薯|薄皮小馄饨|馄饨|advanced-chewing|false|正餐|方法12
stage4-v2-097|牛肉胡萝卜松软肉丸|肉丸|牛肉|牛肉|胡萝卜|松软肉丸|肉丸|advanced-chewing|true|正餐|方法01
stage4-v2-098|鸡腿肉西兰花松软肉丸|肉丸|鸡肉|鸡腿肉|西兰花|松软肉丸|肉丸|advanced-chewing|true|正餐|方法02
stage4-v2-099|猪里脊南瓜松软肉丸|肉丸|猪肉|猪里脊|南瓜|松软肉丸|肉丸|advanced-chewing|true|正餐|方法03
stage4-v2-100|鳕鱼菠菜松软肉丸|肉丸|鱼|鳕鱼|菠菜|松软肉丸|肉丸|advanced-chewing|true|正餐|方法04
stage4-v2-101|鲈鱼土豆松软肉丸|肉丸|鱼|鲈鱼|土豆|松软肉丸|肉丸|advanced-chewing|true|正餐|方法05
stage4-v2-102|三文鱼丝瓜松软肉丸|肉丸|鱼|三文鱼|丝瓜|松软肉丸|肉丸|advanced-chewing|true|正餐|方法06
stage4-v2-103|虾仁油麦菜松软肉丸|肉丸|虾|虾仁|油麦菜|松软肉丸|肉丸|advanced-chewing|true|正餐|方法07
stage4-v2-104|嫩豆腐香菇松软肉丸|肉丸|豆腐|嫩豆腐|香菇|松软肉丸|肉丸|advanced-chewing|true|正餐|方法08
stage4-v2-105|鸡蛋番茄松软肉丸|肉丸|蛋|鸡蛋|番茄|松软肉丸|肉丸|advanced-chewing|true|正餐|方法09
stage4-v2-106|豆腐莴笋松软肉丸|肉丸|豆腐|豆腐|莴笋|松软肉丸|肉丸|advanced-chewing|true|正餐|方法10
stage4-v2-107|鸡胸肉西葫芦松软肉丸|肉丸|鸡肉|鸡胸肉|西葫芦|松软肉丸|肉丸|advanced-chewing|true|正餐|方法11
stage4-v2-108|猪肉红薯松软肉丸|肉丸|猪肉|猪肉|红薯|松软肉丸|肉丸|advanced-chewing|true|正餐|方法12
stage4-v2-109|牛肉胡萝卜无刺软鱼饼|鱼饼|牛肉|牛肉|胡萝卜|无刺软鱼饼|鱼饼|advanced-chewing|true|正餐|方法01
stage4-v2-110|鸡腿肉西兰花无刺软鱼饼|鱼饼|鸡肉|鸡腿肉|西兰花|无刺软鱼饼|鱼饼|advanced-chewing|true|正餐|方法02
stage4-v2-111|猪里脊南瓜无刺软鱼饼|鱼饼|猪肉|猪里脊|南瓜|无刺软鱼饼|鱼饼|advanced-chewing|true|正餐|方法03
stage4-v2-112|鳕鱼菠菜无刺软鱼饼|鱼饼|鱼|鳕鱼|菠菜|无刺软鱼饼|鱼饼|advanced-chewing|true|正餐|方法04
stage4-v2-113|鲈鱼土豆无刺软鱼饼|鱼饼|鱼|鲈鱼|土豆|无刺软鱼饼|鱼饼|advanced-chewing|true|正餐|方法05
stage4-v2-114|三文鱼丝瓜无刺软鱼饼|鱼饼|鱼|三文鱼|丝瓜|无刺软鱼饼|鱼饼|advanced-chewing|true|正餐|方法06
stage4-v2-115|虾仁油麦菜无刺软鱼饼|鱼饼|虾|虾仁|油麦菜|无刺软鱼饼|鱼饼|advanced-chewing|true|正餐|方法07
stage4-v2-116|嫩豆腐香菇无刺软鱼饼|鱼饼|豆腐|嫩豆腐|香菇|无刺软鱼饼|鱼饼|advanced-chewing|true|正餐|方法08
stage4-v2-117|鸡蛋番茄无刺软鱼饼|鱼饼|蛋|鸡蛋|番茄|无刺软鱼饼|鱼饼|advanced-chewing|true|正餐|方法09
stage4-v2-118|豆腐莴笋无刺软鱼饼|鱼饼|豆腐|豆腐|莴笋|无刺软鱼饼|鱼饼|advanced-chewing|true|正餐|方法10
stage4-v2-119|鸡胸肉西葫芦无刺软鱼饼|鱼饼|鸡肉|鸡胸肉|西葫芦|无刺软鱼饼|鱼饼|advanced-chewing|true|正餐|方法11
stage4-v2-120|猪肉红薯无刺软鱼饼|鱼饼|猪肉|猪肉|红薯|无刺软鱼饼|鱼饼|advanced-chewing|true|正餐|方法12
stage4-v2-121|牛肉胡萝卜嫩蒸肉饼|蒸肉饼|牛肉|牛肉|胡萝卜|嫩蒸肉饼|蒸肉饼|advanced-chewing|true|正餐|方法01
stage4-v2-122|鸡腿肉西兰花嫩蒸肉饼|蒸肉饼|鸡肉|鸡腿肉|西兰花|嫩蒸肉饼|蒸肉饼|advanced-chewing|true|正餐|方法02
stage4-v2-123|猪里脊南瓜嫩蒸肉饼|蒸肉饼|猪肉|猪里脊|南瓜|嫩蒸肉饼|蒸肉饼|advanced-chewing|true|正餐|方法03
stage4-v2-124|鳕鱼菠菜嫩蒸肉饼|蒸肉饼|鱼|鳕鱼|菠菜|嫩蒸肉饼|蒸肉饼|advanced-chewing|true|正餐|方法04
stage4-v2-125|鲈鱼土豆嫩蒸肉饼|蒸肉饼|鱼|鲈鱼|土豆|嫩蒸肉饼|蒸肉饼|advanced-chewing|true|正餐|方法05
stage4-v2-126|三文鱼丝瓜嫩蒸肉饼|蒸肉饼|鱼|三文鱼|丝瓜|嫩蒸肉饼|蒸肉饼|advanced-chewing|true|正餐|方法06
stage4-v2-127|虾仁油麦菜嫩蒸肉饼|蒸肉饼|虾|虾仁|油麦菜|嫩蒸肉饼|蒸肉饼|advanced-chewing|true|正餐|方法07
stage4-v2-128|嫩豆腐香菇嫩蒸肉饼|蒸肉饼|豆腐|嫩豆腐|香菇|嫩蒸肉饼|蒸肉饼|advanced-chewing|true|正餐|方法08
stage4-v2-129|鸡蛋番茄嫩蒸肉饼|蒸肉饼|蛋|鸡蛋|番茄|嫩蒸肉饼|蒸肉饼|advanced-chewing|true|正餐|方法09
stage4-v2-130|豆腐莴笋嫩蒸肉饼|蒸肉饼|豆腐|豆腐|莴笋|嫩蒸肉饼|蒸肉饼|advanced-chewing|true|正餐|方法10
stage4-v2-131|鸡胸肉西葫芦嫩蒸肉饼|蒸肉饼|鸡肉|鸡胸肉|西葫芦|嫩蒸肉饼|蒸肉饼|advanced-chewing|true|正餐|方法11
stage4-v2-132|猪肉红薯嫩蒸肉饼|蒸肉饼|猪肉|猪肉|红薯|嫩蒸肉饼|蒸肉饼|advanced-chewing|true|正餐|方法12
stage4-v2-133|牛肉胡萝卜嫩豆腐块|豆腐|牛肉|牛肉|胡萝卜|嫩豆腐块|豆腐|beginner-chewing|true|正餐|方法01
stage4-v2-134|鸡腿肉西兰花嫩豆腐块|豆腐|鸡肉|鸡腿肉|西兰花|嫩豆腐块|豆腐|beginner-chewing|true|正餐|方法02
stage4-v2-135|猪里脊南瓜嫩豆腐块|豆腐|猪肉|猪里脊|南瓜|嫩豆腐块|豆腐|beginner-chewing|true|正餐|方法03
stage4-v2-136|鳕鱼菠菜嫩豆腐块|豆腐|鱼|鳕鱼|菠菜|嫩豆腐块|豆腐|beginner-chewing|true|正餐|方法04
stage4-v2-137|鲈鱼土豆嫩豆腐块|豆腐|鱼|鲈鱼|土豆|嫩豆腐块|豆腐|beginner-chewing|true|正餐|方法05
stage4-v2-138|三文鱼丝瓜嫩豆腐块|豆腐|鱼|三文鱼|丝瓜|嫩豆腐块|豆腐|beginner-chewing|true|正餐|方法06
stage4-v2-139|虾仁油麦菜嫩豆腐块|豆腐|虾|虾仁|油麦菜|嫩豆腐块|豆腐|beginner-chewing|true|正餐|方法07
stage4-v2-140|嫩豆腐香菇嫩豆腐块|豆腐|豆腐|嫩豆腐|香菇|嫩豆腐块|豆腐|beginner-chewing|true|正餐|方法08
stage4-v2-141|鸡蛋番茄嫩豆腐块|豆腐|蛋|鸡蛋|番茄|嫩豆腐块|豆腐|beginner-chewing|true|正餐|方法09
stage4-v2-142|豆腐莴笋嫩豆腐块|豆腐|豆腐|豆腐|莴笋|嫩豆腐块|豆腐|beginner-chewing|true|正餐|方法10
stage4-v2-143|鸡胸肉西葫芦嫩豆腐块|豆腐|鸡肉|鸡胸肉|西葫芦|嫩豆腐块|豆腐|beginner-chewing|true|正餐|方法11
stage4-v2-144|猪肉红薯嫩豆腐块|豆腐|猪肉|猪肉|红薯|嫩豆腐块|豆腐|beginner-chewing|true|正餐|方法12
stage4-v2-145|牛肉胡萝卜燕麦早餐杯|早餐|牛肉|牛肉|胡萝卜|燕麦早餐杯|早餐杯|beginner-chewing|true|早餐|方法01
stage4-v2-146|鸡腿肉西兰花燕麦早餐杯|早餐|鸡肉|鸡腿肉|西兰花|燕麦早餐杯|早餐杯|beginner-chewing|true|早餐|方法02
stage4-v2-147|猪里脊南瓜燕麦早餐杯|早餐|猪肉|猪里脊|南瓜|燕麦早餐杯|早餐杯|beginner-chewing|true|早餐|方法03
stage4-v2-148|鳕鱼菠菜燕麦早餐杯|早餐|鱼|鳕鱼|菠菜|燕麦早餐杯|早餐杯|beginner-chewing|true|早餐|方法04
stage4-v2-149|鲈鱼土豆燕麦早餐杯|早餐|鱼|鲈鱼|土豆|燕麦早餐杯|早餐杯|beginner-chewing|true|早餐|方法05
stage4-v2-150|三文鱼丝瓜燕麦早餐杯|早餐|鱼|三文鱼|丝瓜|燕麦早餐杯|早餐杯|beginner-chewing|true|早餐|方法06
stage4-v2-151|虾仁油麦菜燕麦早餐杯|早餐|虾|虾仁|油麦菜|燕麦早餐杯|早餐杯|beginner-chewing|true|早餐|方法07
stage4-v2-152|嫩豆腐香菇燕麦早餐杯|早餐|豆腐|嫩豆腐|香菇|燕麦早餐杯|早餐杯|beginner-chewing|true|早餐|方法08
stage4-v2-153|鸡蛋番茄燕麦早餐杯|早餐|蛋|鸡蛋|番茄|燕麦早餐杯|早餐杯|beginner-chewing|true|早餐|方法09
stage4-v2-154|豆腐莴笋燕麦早餐杯|早餐|豆腐|豆腐|莴笋|燕麦早餐杯|早餐杯|beginner-chewing|true|早餐|方法10
stage4-v2-155|鸡胸肉西葫芦燕麦早餐杯|早餐|鸡肉|鸡胸肉|西葫芦|燕麦早餐杯|早餐杯|beginner-chewing|true|早餐|方法11
stage4-v2-156|猪肉红薯燕麦早餐杯|早餐|猪肉|猪肉|红薯|燕麦早餐杯|早餐杯|beginner-chewing|true|早餐|方法12
stage4-v2-157|牛肉胡萝卜软饭混合餐|混合餐|牛肉|牛肉|胡萝卜|软饭混合餐|混合餐|advanced-chewing|false|正餐|方法01
stage4-v2-158|鸡腿肉西兰花软饭混合餐|混合餐|鸡肉|鸡腿肉|西兰花|软饭混合餐|混合餐|advanced-chewing|false|正餐|方法02
stage4-v2-159|猪里脊南瓜软饭混合餐|混合餐|猪肉|猪里脊|南瓜|软饭混合餐|混合餐|advanced-chewing|false|正餐|方法03
stage4-v2-160|鳕鱼菠菜软饭混合餐|混合餐|鱼|鳕鱼|菠菜|软饭混合餐|混合餐|advanced-chewing|false|正餐|方法04
stage4-v2-161|鲈鱼土豆软饭混合餐|混合餐|鱼|鲈鱼|土豆|软饭混合餐|混合餐|advanced-chewing|false|正餐|方法05
stage4-v2-162|三文鱼丝瓜软饭混合餐|混合餐|鱼|三文鱼|丝瓜|软饭混合餐|混合餐|advanced-chewing|false|正餐|方法06
stage4-v2-163|虾仁油麦菜软饭混合餐|混合餐|虾|虾仁|油麦菜|软饭混合餐|混合餐|advanced-chewing|false|正餐|方法07
stage4-v2-164|嫩豆腐香菇软饭混合餐|混合餐|豆腐|嫩豆腐|香菇|软饭混合餐|混合餐|advanced-chewing|false|正餐|方法08
stage4-v2-165|鸡蛋番茄软饭混合餐|混合餐|蛋|鸡蛋|番茄|软饭混合餐|混合餐|advanced-chewing|false|正餐|方法09
stage4-v2-166|豆腐莴笋软饭混合餐|混合餐|豆腐|豆腐|莴笋|软饭混合餐|混合餐|advanced-chewing|false|正餐|方法10
stage4-v2-167|鸡胸肉西葫芦软饭混合餐|混合餐|鸡肉|鸡胸肉|西葫芦|软饭混合餐|混合餐|advanced-chewing|false|正餐|方法11
stage4-v2-168|猪肉红薯软饭混合餐|混合餐|猪肉|猪肉|红薯|软饭混合餐|混合餐|advanced-chewing|false|正餐|方法12
stage4-v2-169|牛肉胡萝卜山药蔬菜蒸糕|蒸糕|牛肉|牛肉|胡萝卜|山药蔬菜蒸糕|蒸糕|beginner-chewing|true|加餐|方法01
stage4-v2-170|鸡腿肉西兰花山药蔬菜蒸糕|蒸糕|鸡肉|鸡腿肉|西兰花|山药蔬菜蒸糕|蒸糕|beginner-chewing|true|加餐|方法02
stage4-v2-171|猪里脊南瓜山药蔬菜蒸糕|蒸糕|猪肉|猪里脊|南瓜|山药蔬菜蒸糕|蒸糕|beginner-chewing|true|加餐|方法03
stage4-v2-172|鳕鱼菠菜山药蔬菜蒸糕|蒸糕|鱼|鳕鱼|菠菜|山药蔬菜蒸糕|蒸糕|beginner-chewing|true|加餐|方法04
stage4-v2-173|鲈鱼土豆山药蔬菜蒸糕|蒸糕|鱼|鲈鱼|土豆|山药蔬菜蒸糕|蒸糕|beginner-chewing|true|加餐|方法05
stage4-v2-174|三文鱼丝瓜山药蔬菜蒸糕|蒸糕|鱼|三文鱼|丝瓜|山药蔬菜蒸糕|蒸糕|beginner-chewing|true|加餐|方法06
stage4-v2-175|虾仁油麦菜山药蔬菜蒸糕|蒸糕|虾|虾仁|油麦菜|山药蔬菜蒸糕|蒸糕|beginner-chewing|true|加餐|方法07
stage4-v2-176|嫩豆腐香菇山药蔬菜蒸糕|蒸糕|豆腐|嫩豆腐|香菇|山药蔬菜蒸糕|蒸糕|beginner-chewing|true|加餐|方法08
stage4-v2-177|鸡蛋番茄山药蔬菜蒸糕|蒸糕|蛋|鸡蛋|番茄|山药蔬菜蒸糕|蒸糕|beginner-chewing|true|加餐|方法09
stage4-v2-178|豆腐莴笋山药蔬菜蒸糕|蒸糕|豆腐|豆腐|莴笋|山药蔬菜蒸糕|蒸糕|beginner-chewing|true|加餐|方法10
stage4-v2-179|鸡胸肉西葫芦山药蔬菜蒸糕|蒸糕|鸡肉|鸡胸肉|西葫芦|山药蔬菜蒸糕|蒸糕|beginner-chewing|true|加餐|方法11
stage4-v2-180|猪肉红薯山药蔬菜蒸糕|蒸糕|猪肉|猪肉|红薯|山药蔬菜蒸糕|蒸糕|beginner-chewing|true|加餐|方法12
`.trim().split('\n').map(line=>line.split('|'));

const FISH=/鱼|鳕|鲈|三文鱼/;
const MEAT=/肉|鸡|牛|猪/;
const METHODS={
  '方法01':'先蒸后压，保留细小柔软颗粒',
  '方法02':'先焯后剁，再与主食拌匀',
  '方法03':'隔水蒸熟，出锅后切成柔软扁块',
  '方法04':'小火焖软，收至湿润不黏成团',
  '方法05':'蒸熟压散，再塑成容易抓握的宽条',
  '方法06':'煮软剪短，与蔬菜碎均匀混合',
  '方法07':'薄铺蒸熟，放温后分成柔软小片',
  '方法08':'先煮后拌，保持湿润且不形成小圆块',
  '方法09':'剁细混合后蒸透，轻压成扁椭圆形',
  '方法10':'低温慢蒸至熟透，拆分成柔软薄片',
  '方法11':'加少量水焖至软烂，再压成粗碎质地',
  '方法12':'分别蒸软后组合，保留可压碎的小软块'
};
const METHOD_VALUES=Object.values(METHODS);

function allergensFor(protein,staple){
  const allergens=[];
  if(/鸡蛋/.test(protein)||/蒸蛋|蒸糕|软饼|早餐/.test(staple)) allergens.push('蛋');
  if(/意面|面|饺子|馄饨|软饼/.test(staple)) allergens.push('小麦');
  if(/豆腐/.test(protein)) allergens.push('大豆');
  if(FISH.test(protein)) allergens.push('鱼');
  if(/虾/.test(protein)) allergens.push('甲壳类');
  return allergens;
}

function safeProteinStep(protein){
  if(FISH.test(protein)) return `${protein}彻底蒸熟并逐片检查去刺，再压成细碎软末。`;
  if(MEAT.test(protein)) return `${protein}选无骨部位，彻底煮熟后切碎或剁细。`;
  if(/虾/.test(protein)) return `${protein}去壳去虾线，彻底煮熟后切碎。`;
  return `${protein}彻底加热熟透，处理成柔软小块。`;
}

function enrichLegacy(recipe,index){
  const cookingMethod=METHOD_VALUES[Math.floor(index/12)%METHOD_VALUES.length];
  const fingerFood=/饭团|饺子|肉丸/.test(recipe.texture);
  return {
    ...recipe,
    ingredients:[...recipe.ingredients,...stapleIngredients(recipe.staple)],
    chewingLevel:index<60?'beginner-chewing':'advanced-chewing',
    fingerFood,
    freezable:!/蒸蛋/.test(recipe.texture),
    cookingMethod,
    sizeGuide:fingerFood?'做成约两指宽、宝宝容易抓握的柔软块；根据实际咀嚼能力再切小。':'煮至软烂后剪成短段或压成小软块，避免小、圆、硬或黏成团。',
    softnessTest:'上桌前用拇指和食指轻压，能够轻松压碎才提供。',
    substitutions:['同类蛋白质可在已安全尝试后等量替换。','蔬菜可换成煮软后同样容易压碎的当季蔬菜。'],
    allergens:allergensFor(recipe.protein,recipe.staple),
    mealSlots:['午餐','晚餐'],
    steps:[
      safeProteinStep(recipe.protein),
      `${cookingMethod}；${recipe.vegetable}煮至柔软后与${recipe.staple}混合，成品避免小、硬、黏。`,
      '上桌前按宝宝发育能力调整大小，并用拇指和食指确认可轻松压碎。'
    ]
  };
}

function additionalRecipe(row,index){
  const [id,name,category,group,protein,vegetable,staple,texture,chewingLevel,fingerFood,mealSlot,method]=row;
  return {
    id,name,group,protein,vegetable,fruit:'',staple,stage:'stage4',stageName:'咀嚼练习期',age:'约9～12个月',
    texture,caroteneBand:/胡萝卜|南瓜|菠菜|红薯/.test(vegetable)?'high':'normal',
    ingredients:[`${protein} 15～25g`,`${vegetable} 20～30g`,`${staple} 适量`,...stapleIngredients(staple)],
    steps:[
      safeProteinStep(protein),
      `${METHODS[method]}：将${vegetable}彻底蒸软，与${staple}做成“${name}”；避免小、圆、硬或黏的形态。`,
      `按宝宝当前发育能力调整${category}的形状和大小，上桌前再次确认柔软。`
    ],
    storage:'建议现做现吃；如冷冻备餐，分装后彻底复热并重新检查质地。',
    chewingLevel,
    cookingMethod:METHODS[method],
    fingerFood:fingerFood==='true',
    freezable:!/豆腐|早餐/.test(category),
    sizeGuide:fingerFood==='true'?'做成约两指宽、宝宝容易抓握的柔软长条或扁块；能熟练处理后再逐渐缩小。':'剪短或分成不易形成小圆块的软片，大小随咀嚼能力调整。',
    softnessTest:'上桌前用拇指和食指轻压，能够轻松压碎才提供。',
    substitutions:['同类蛋白质可在已安全尝试后替换。','主食或蔬菜替换后仍须煮至柔软可压碎。'],
    allergens:allergensFor(protein,staple),
    mealSlots:mealSlot==='早餐'?['早餐','加餐']:mealSlot==='加餐'?['加餐']:['午餐','晚餐']
  };
}

function stapleIngredients(staple){
  if(/蒸蛋/.test(staple)) return ['鸡蛋液 10～15g'];
  if(/蒸糕/.test(staple)) return ['低筋小麦面粉 10～15g','鸡蛋液 5～10g'];
  if(/软饼/.test(staple)) return ['小麦面粉 10～15g','鸡蛋液 5～10g'];
  if(/早餐/.test(staple)) return ['燕麦片 10～15g','鸡蛋液 5～10g'];
  if(/意面/.test(staple)) return ['小麦意面 15～25g'];
  if(/碎软面/.test(staple)) return ['小麦面条 15～25g'];
  if(/饺子/.test(staple)) return ['小麦饺子皮 10～15g'];
  if(/馄饨/.test(staple)) return ['小麦馄饨皮 10～15g'];
  if(/饭团|混合餐/.test(staple)) return ['熟软米饭 20～30g'];
  return [];
}

export function buildStage4RecipesV2(legacyStage4){
  return [
    ...legacyStage4.map(enrichLegacy),
    ...ADDITIONAL_ROWS.map(additionalRecipe)
  ];
}
