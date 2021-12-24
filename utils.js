const strConvertor = {
  replacements:{
    '&amp;':'&',
    '&lt;':'<',
    '&gt;':'>',
    '&sol;':'/',
    '&quot;':'"',
    '&apos;':'\'',
    '&laquo;':'«',
    '&raquo;':'»',
    '&nbsp;':' ',
    '&copy;':'©',
    '&reg;':'®',
    '&deg;':'°'
  },
  decode: function (inp){
    for(var r in this.replacements){
      inp = inp.replace(new RegExp(r,'g'),this.replacements[r]);
    }
    return inp.replace(/&#(\d+);/g, function(match, dec) {
      return String.fromCharCode(dec);
    });
  },
  encode: function (inp) {
    Object.entries(this.replacements).forEach(([str, sym])=>{
      inp = inp.replace(sym, str);
    })
    return inp;
  }
  
}


function CreateRegExp(string, flags = "ig") {
  try {
    return new RegExp(string, flags);
  } catch (error) {
    return string;
  }
}

const {
  PostModel
} = require("./models");

class GlobalState{
  constructor(){
    this.categories = [],
    this.keywords = []
  }
  async getKeywords(){
    // ---- A - find all the keywords
    let keywords = await PostModel.find({}, "keywords -_id");
    if(keywords === null) return false;
    // make a unified form of string out of keywords
    keywords = keywords
      .map(w=> w.keywords)
      .join(", ").split(", ")
      .map(w=>w.trim().toLowerCase());
    // find unique keywords
    let uniqueWords = [];
    keywords.forEach(word => {
      if(!uniqueWords.includes(word)) uniqueWords.push(word)
    })
    // using unique keywords, find how many time they are used
    let word_rates = uniqueWords.map(word=>{
      let times = 0;
      keywords.forEach(word => {
        if(word === word) times++;
      })
      return [word, times];
    });
    // sort them and get top 7
    let rated_keywords = word_rates
      .sort((a, b)=> b[1]-a[1])
      .slice(0, 10)
      .map(w=> w[0])
    this.keywords = rated_keywords;
  }
  async getCategories(){
    // ---- B - get all the distinct categories
    this.categories = await PostModel.find().distinct("category");
  }
  async update(){
    try {
      await this.getKeywords();
      await this.getCategories();
      console.log("--- Global state updated!");
    } catch (error) {
      console.log("+++ Global state failed to update!");
    }
  }
}


module.exports = { CreateRegExp, GlobalState };