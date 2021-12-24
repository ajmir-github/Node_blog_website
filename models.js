const { Schema, model } = require("mongoose");

// -----------------------------------------------------------------------------------------
// UserSchema => firstName, lastName, username, email, phoine, address, posts, profile_photo, role
const UserSchema = new Schema({
  firstName:{
    type:String,
    required:true
  },
  lastName:{
    type:String,
    required:true
  },
  username:{
    type:String,
    required:true
  },
  password:{
    type:String,
    required:true
  },
  dateOfBirth:{
    type:Date,
    required:true
  },
  email:{
    type:String,
    required:true
  },
  date:{
    type:Date,
    default: Date.now()
  },
  phone:{
    type:String,
    required:true
  },
  address:{
    type:String,
    required:true
  },
  posts:{
    type:Number,
    default:0
  },
  views:{
    type:Number,
    default:0
  },
  profile_photo:{
    type:String,
    default:"/sdf.jpg"
  },
  role:{
    roleName:{
      type:String,
      default:"Blogger"
    },
    type:{ // role.type 1 = Root, 2 = Admin, 3 = Blogger
      type: Number,
      default:3
    }
  }
});


const UserModel = model("User", UserSchema);


// -----------------------------------------------------------------------------------------
const PostSchema = new Schema({
  title:{
    type:String,
    required:true
  },
  intro: {
    type:String,
    required:true
  },
  content: {
    type:String,
    required:true
  },
  category: {
    type:String,
    required:true
  },
  keywords: {
    type:String,
    required:true
  },
  image:{
    type:String,
    required:true
  },
  date:{
    type:Date,
    default:Date.now
  },
  author:{
    type:String,
    required:true
  },
  views:{
    type:Number,
    required:true,
    default:0
  },
  created_by: { type:Schema.Types.ObjectId, ref:"User", required:true },
  comments:[
    {
      created_at:{
        type:Date,
        default:Date.now
      },
      message:{
        type:String,
        required:true
      },
      subject:{
        type:String,
        required:true
      },
      name:{
        type:String,
        required:true
      },
      email:{
        type:String,
        required:true
      }
    }
  ]
})


const PostModel = model("Post", PostSchema);


// -----------------------------------------------------------------------------------------
const ContactSchema = new Schema({
  name:{
    type:String,
    required:true
  },
  email:{
    type:String,
    required:true
  },
  subject:{
    type:String,
    required:true
  },
  message:{
    type:String,
    required:true
  },
  date:{
    type:Date,
    default:Date.now()
  }
})

const ContactModel =  model("Contact", ContactSchema);

// -----------------------------------------------------------------------------------------
module.exports = { UserModel, PostModel, ContactModel }