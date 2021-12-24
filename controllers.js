// ----------------------------- Required Modules
const express = require('express');
const router = express.Router();
const fs = require("fs");
const {
  UserModel,
  PostModel,
  ContactModel
} = require("./models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4:generateUniqueName } = require("uuid");
const {
  CreateRegExp,
  GlobalState
} = require("./utils");

// ----------------------------- Global varaibles
const globalState = new GlobalState();
globalState.update();


// ----------------------------- Meddlewares
async function authUser(req, res, next) {
  const cookie = req.cookies[process.env.JWT_COOKIE_NAME];
  try {
    if(cookie){
    // check the cookie is modified of not ???
        const { id } = jwt.verify(cookie, process.env.JWT_SECRET_KEY); // high potential server error
        // User verified
        const loggedUser = await UserModel.findById(id); // potential server error
        // if user not found
        if(loggedUser === null) {
          res.clearCookie(process.env.JWT_COOKIE_NAME);
          res.redirect("/sign_in");
        } else {
          res.payload = loggedUser;
          next();
        }
      } else {
        throw "Access Denied! Due not having authenticated token!";
      }
    } catch (error) {
      console.log(error); //Only for debugging
      res.render("message", {
        type:"danger",
        message:"Sorry, access denied! due to invalid signature. Please sign in agian!",
        link:{
          name:"Go To Sign in Page",
          href:"/sign_in"
        }
      })
    }  
}


// ----------------------------- Routes
router.get("/about", (req ,res)=>{
  res.render("about");
})

router.get("/bloggers", async (req, res)=>{
  try {
    // Get request and default vars
    let search = req.query?.search;
    let page = +req.query?.page || 1;
    let pagesLimit = 8;
    let pageofDep = "";
    if(page < 1) page = 1;
    // create a query based of the given categories and keywords
    let searchQuery = {};
   if(search !== undefined){
      const [aStr, bStr, ...restStr] = search.split(" ");
      const aReg = CreateRegExp(aStr);
      const bReg = CreateRegExp(bStr);
      searchQuery = {
        "$or":[
          { firstName:aReg, lastName:bReg },
          { firstName:bReg, lastName:aReg }
        ]
      }
      pageofDep = `&search=${search}`;
    }
    // Main users
    const users = await UserModel // potential server error
      .find(searchQuery)
      .sort({views:-1})
      .skip(pagesLimit*(page-1))
      .limit(pagesLimit);

    // // pagination tacker
    let pagination = {
      page:page,
      prev: (page<=1)? `/bloggers?page=${page}${pageofDep}` : `/bloggers?page=${page-1}${pageofDep}`,
      curr:`/bloggers?page=${page}${pageofDep}`,
      next:`/bloggers?page=${page+1}${pageofDep}`,
      hasNext:(users.length == pagesLimit)
    };

    // // if users were not found
    const usersFound = users.length > 0;

    // render
    res.render("bloggers", {
      users,
      usersFound,
      pagination,
      categories:globalState.categories,
      keywords:globalState.keywords,
    })

  } catch (error) {
    console.log(error); //Only for debugging
    res.render("message", {
      type:"danger",
      message:"Sorry, Server has failed to retrieve data. Please try again later!",
      link:{
        name:"Go To home Page",
        href:"/"
      }
    })
  }
})


router.get("/blogger/:id", async (req, res)=>{
  try {
    const id = req.params.id;
    const foundBlogger = await UserModel.findById(id);
    if(foundBlogger === null){
      console.log(error); //Only for debugging
      res.render("message", {
        type:"danger",
        message:"Sorry, no blogger with the given id was found!",
        link:{
          name:"Go To bloggers Page",
          href:"/bloggers"
        }
      })
    } else {
      // get the posts of this user
      const foundPosts = await PostModel.find({created_by: id}).limit(8).sort({views:-1});
      const postsFound = foundPosts.length > 0;
      res.render("blogger", {
        blogger:foundBlogger,
        postsFound,
        posts:foundPosts,
        categories:globalState.categories,
        keywords:globalState.keywords
      })
    }
  } catch (error) {
    console.log(error); //Only for debugging
    res.render("message", {
      type:"danger",
      message:"Sorry, Server has failed to retrieve data. Please try again later!",
      link:{
        name:"Go To bloggers Page",
        href:"/bloggers"
      }
    })
  }
})



router.get("/sign_in", (req, res)=>{
  // if cookie is there, redirect it directly to the profile page
  const cookie = req.cookies[process.env.JWT_COOKIE_NAME];
  if(cookie){
      res.redirect("/profile");
  } else {
      res.render("sign_in", {alert:false})
  }
})

router.get("/sign_up", (req ,res)=>{
  res.render("sign_up", {alert:false, message:""});
})


router.post("/sign_up", async (req, res)=>{
 try{
    // validate the data
    const userData = req.body;
    // avoid username dublication
    const foundUsers = await UserModel.find({username:userData.username}); // potential server error
    if(foundUsers.length > 0) throw "A user by this username has already created! Try a different username.";
    // hash the password
    const password = await bcrypt.hash(userData.password, 10);
    // add it to the database
    const userObject = new UserModel({...userData, password}); // potential server error
    // upload the profile
    // upload image
    const imageFile = req.files['profile_photo'];
    const imageExtention = imageFile.name.split(".").reverse()[0];
    const imageName = `${generateUniqueName()}.${imageExtention}`;
    const imagePath = `./public/files/user/${imageName}`;
    await imageFile.mv(imagePath);
    userObject.profile_photo = imageName;
    //-------------------
    await userObject.save();
    // redirect or sign in page
    res.render("sign_in", {alert:true, message: "User has successfully created. Now you can sign in!"});
  } catch (error) {
    console.log(error); //Only for debugging
      res.render("message", {
        type:"danger",
        message:"Sorry, server has failed signing you up. Please sign up later!",
        link:{
          name:"Go To Sign up Page",
          href:"/sign_up"
        }
      })
  }
})


router.get("/profile", async (req, res)=>{
  const cookie = req.cookies[process.env.JWT_COOKIE_NAME];
  try {
    if(cookie){
    // check the cookie is modified of not ???
        const { id } = jwt.verify(cookie, process.env.JWT_SECRET_KEY); // high potential server error
        // User verified
        const loggedUser = await UserModel.findById(id); // potential server error
        // if user not found
        if(loggedUser === null) {
          res.clearCookie(process.env.JWT_COOKIE_NAME);
          res.redirect("/sign_in");
        } else {
          res.render("profile/profile", {user:loggedUser})
        }
      } else {
        throw "Access Denied! Due not having authenticated token!";
      }
    } catch (error) {
      console.log(error); //Only for debugging
      res.render("message", {
        type:"danger",
        message:"Sorry, access denied! due to invalid signature. Please sign in agian!",
        link:{
          name:"Go To Sign in Page",
          href:"/sign_in"
        }
      })
    }
})




router.get("/sign_out", (req, res)=>{
  res.clearCookie(process.env.JWT_COOKIE_NAME);
  res.render("sign_in", {alert:true, message:"You are successfully logged out!"})
})


router.post("/sign_in", async (req, res)=>{
  try {
    const { username, password } = req.body;
    console.log(req.body);
    const foundUser = await UserModel.findOne({username}); // potential server error
    if(foundUser !== null){
      const passwordMatched = await bcrypt.compare(password, foundUser.password);
      if(passwordMatched){
        // Set Token, Parse it into a cookie and send it to the user
        const id = foundUser["_id"];
        const token = jwt.sign(
          { id },
          process.env.JWT_SECRET_KEY, {
            expiresIn: process.env.JWT_EXPIRES_IN
          }
          );
          const timeLength = (+process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000);
          const cookieOptions = {
            expires: new Date(Date.now() + timeLength),
            httpOnly: true, signed:false
          };
          res.cookie(process.env.JWT_COOKIE_NAME, token, cookieOptions);
          // give a positive response back
          res.redirect("/profile");
        } else {
          res.render("sign_in", {alert:true, message: "Password has not matched!"});
        }
      } else {
        res.render("sign_in", {alert:true, message: "Username has not matched!"});
      }
  } catch (error) {
    console.log(error); //Only for debugging
    res.render("message", {
      type:"danger",
      message:"Sorry, Server has failed to match your account. Please try agian later!",
      link:{
        name:"Go To Sign in Page",
        href:"/sign_in"
      }
    })
  }
})
    
    
    
router.post("/add_post", async (req, res)=>{
  const cookie = req.cookies[process.env.JWT_COOKIE_NAME];
  if(cookie){
    // check the cookie is modified of not ???
    try {
      const { id } = jwt.verify(cookie, process.env.JWT_SECRET_KEY);
      // User verified
      const loggedUser = await UserModel.findById(id);
      // if user not found
      if(loggedUser === null) {
            res.clearCookie(process.env.JWT_COOKIE_NAME);
            res.redirect("/sign_in");
          } else {
            // here you can create a post and upload its image
            const newPost = new PostModel({...req.body});
            newPost.created_by = loggedUser["_id"];
            newPost.author = loggedUser.firstName+" "+loggedUser.lastName;
            // upload image
            const imageFile = req.files['image'];
            const imageExtention = imageFile.name.split(".").reverse()[0];
            const imageName = `${generateUniqueName()}.${imageExtention}`;
            const imagePath = `./public/files/post/${imageName}`;
            await imageFile.mv(imagePath);
            newPost.image = imageName;
            const createdPost = await newPost.save();
            res.redirect(`/post/${createdPost["_id"]}`);
            // increment the number of posts in the UserModel
            const foundUser = await UserModel.findById(id);
            foundUser.posts += 1;
            foundUser.save();

          }
      } catch (error) {
        console.log(error); //Only for debugging
        // Access Denied! Due to invalid signature
        res.render("message", {
          type:"danger",
          message:"Sorry, access Denied! Due to invalid signature. Sign in first and then try!",
          link:{
            name:"Go To Sign in Page",
            href:"/sign_in"
          }
        })
      }
  } else {
      // Access Denied! Due not having authenticated token
      res.clearCookie(process.env.JWT_COOKIE_NAME); // clear the unvalid cookie
      res.render("message", {
        type:"warning",
        message:"Sorry, Access denied! Due to invalid or expired cookie. Sign in first and then try!",
        link:{
          name:"Go To Sign in Page",
          href:"/sign_in"
        }
      })
  }
})


router.post("/post", async (req, res)=>{
  const cookie = req.cookies[process.env.JWT_COOKIE_NAME];
  try {
    if(cookie){
        // check the cookie is modified of not ???
        const { id } = jwt.verify(cookie, process.env.JWT_SECRET_KEY); // high potential server error
        // User verified
        const loggedUser = await UserModel.findById(id); // potential server error
        // is the correspodent user
        const postID = req.body?.id;
        const foundPost = await PostModel.findById(postID);
        if(foundPost === null) throw "Post not found";
        // if is coorespondent user or admin user
        if(id == foundPost.created_by || loggedUser.role.type < 3){
          console.log("you can delete");
        } else {
          console.log("you can't delete");
        }
        // foundPost.save();
        // console.log(foundPost);
        res.send("deleted")
    }
  } catch (error) {
    console.log(error);
    res.send("not deleted")
  }
})

router.get("/", async (req, res)=>{
  try {
    // Get request and default vars
    const keyword = req.query?.keyword;
    const category = req.query?.category;
    const search = req.query?.search;
    let page = +req.query?.page || 1;
    let pagesLimit = 8;
    let pageofDep = "";
    if(page < 1) page = 1;
    // create a query based of the given categories and keywords
    let searchQuery = {};
    if(keyword !== undefined){
      searchQuery = {
        "keywords":CreateRegExp(keyword)
      }
      pageofDep = `&keyword=${keyword}`;

    } else if(category !== undefined){
      searchQuery = {
        "category":CreateRegExp(category)
      }
      pageofDep = `&category=${category}`;

    } else if(search !== undefined){
      const searchRegExp = CreateRegExp(search);
      searchQuery = {
        "$or":[
          {"title": searchRegExp},
          {"intro": searchRegExp},
          {"keywords": searchRegExp},
          {"author": searchRegExp}
        ]
      }
      pageofDep = `&search=${search}`;

    }
    // Main Posts
    const posts = await PostModel // potential server error
      .find(searchQuery)
      .sort({date:-1})
      .skip(pagesLimit*(page-1))
      .limit(pagesLimit);

    // FeaturedPosts having more views for top slider
    const featuredPosts = await PostModel // potential server error
      .find()
      .sort({views:-1})
      .limit(5);

    // pagination tacker
    let pagination = {
      page:page,
      prev: (page<=1)? `/?page=${page}${pageofDep}` : `/?page=${page-1}${pageofDep}`,
      curr:`/?page=${page}${pageofDep}`,
      next:`/?page=${page+1}${pageofDep}`,
      hasNext:(posts.length == pagesLimit)
    };

    // if posts were not found
    const postsFound = posts.length > 0;

    // render
    res.render("index", {
      posts,
      featuredPosts,
      postsFound,
      categories:globalState.categories,
      keywords:globalState.keywords,
      pagination,
    })

  } catch (error) {
    console.log(error); //Only for debugging
    res.render("message", {
      type:"danger",
      message:"Sorry, Server has failed to retrieve data. Please try again later!",
      link:{
        name:"Go To posts Page",
        href:"/"
      }
    })
  }
})



router.get("/post/:id", async (req, res)=>{
  try {
    const foundPost = await PostModel.findById(req.params.id);
    if(foundPost === null){ // If not found
      res.render("message", {
        type:"warning",
        message:"The given url could not be accessed. Whether it is outdated or does not exist at all. Please check again!",
        link:{
          name:"Go To Home Page",
          href:"/"
        }
      })

    } else {
      res.render("post", {
        post:foundPost,
        categories:globalState.categories,
        keywords:globalState.keywords
      })
      // increment the views of this post
      foundPost.views += 1;
      foundPost.save();
      // increment the views of user
      const foundUser = await UserModel.findById(foundPost.created_by);
      foundUser.views += 1;
      foundUser.save();
    }
  } catch (error) {
    console.log(error); // only for debugging
    res.render("message", { // if error was thrown
      type:"danger",
      message:"Sorry, the given id of post is incorrect! Please make sure  that the url is correct!",
      link:{
        name:"Go back Home",
        href:"/"
      }
    })
  }
})




router.post("/make_comment/:id", async(req, res)=>{
  try {
    const id = req.params?.id;
    const targeted_post = await PostModel.findById(id);
    // this will create a nested object using the give schema given
    targeted_post.comments.push(req.body);
    await targeted_post.save();
    res.render("message", {
      type:"success",
      message:"Cool, your comment has successfully added!",
      link:{
        name:"Go back To the Post",
        href:"/post/"+id
      }
    })
  } catch (error) {
    console.log(error); // only for debugging
    res.render("message", {
      type:"danger",
      message:"Sorry, server could not save your comment. Please try again later!",
      link:{
        name:"Go back Home",
        href:"/"
      }
    })
  }
})


router.post("/contact", async (req, res)=>{
  try {
    const newContact = new ContactModel({...req.body})
    await newContact.save()
    console.log(newContact);
    res.render("message", {
      type:"success",
      message:"We have recieved your message, and we will try our best to respond ASAP!",
      link:{
        name:"Go back to about page",
        href:"/about"
      }
    })
  } catch (error) {
    console.log(error); // only for debugging
    res.render("message", {
      type:"danger",
      message:"Sorry, server could not save your message. Please try again later!",
      link:{
        name:"Go back to about page",
        href:"/about"
      }
    })
  }
})


// profile_posts url
router.get("/profile/posts", authUser, (req, res)=>{
  res.render("profile/posts", {user:res.payload})
})


router.get("/profile/posts/search", authUser, async (req, res)=>{
  try {

    const input = req.query?.search;
    const userType = res.payload?.role?.type;
    let query = { title:new RegExp(input, "ig") };
    if(!(userType == 1 || userType == 2)){
      query.created_by = res.payload["_id"];
    }
    const foundPosts = await PostModel.find(
      query, "title date author"
    ).limit(20).sort({date:-1});
    res.json(foundPosts)
  } catch (error) {
    res.status(500).json("Sever failed fetching the posts!");
  }
})

router.get("/profile/posts/delete/:id", authUser, async (req, res)=>{
  try {
    const id = req.params?.id;
    const confirmed = req.query?.confirmed || false;
    const post = await PostModel.findById(id);
    const isAuthor = post.created_by.toString() === res.payload._id.toString();
    const isAdmin = res.payload?.role?.type === 1 || res.payload?.role?.type === 2;
    if(isAuthor || isAdmin){
      // Coorespondent author
      if(confirmed !== "true"){
        // if not confiremed
        res.render("prompt", {
          type:"warning",
          message:"Are you sure to delete this post!",
          accept:{
            name:"Yes",
            href:`/profile/posts/delete/${id}?confirmed=true`
          },
          reject:{
            name:"No",
            href:`/profile/posts`
          }
        })
      } else {
        // if confirmed
        const imagePath = `./public/files/post/${post.image}`;
        fs.unlink(imagePath, ()=>{});
        await post.remove();
        res.render("message", {
          type:"success",
          message:"The selected post is deleted successfully!",
          link:{
            name:"Go back",
            href:"/profile/posts"
          }
        })
      }
    } else {
      // Not coorespondent author
      res.render("message", {
        type:"danger",
        message:"Sorry, you do not have the authority. Please ask the admin!",
        link:{
          name:"Go back",
          href:"/profile/posts"
        }
      })
    }
  } catch (error) {
    res.render("message", {
      type:"danger",
      message:"Sorry, the process has failed. Please try again later!",
      link:{
        name:"Go back",
        href:"/profile/posts"
      }
    })
  }
})

// profile_users url
router.get("/profile/users", authUser, (req, res)=>{
  res.render("profile/users", {user:res.payload})
})

// add user
router.post("/add_user", authUser, async (req, res)=>{
  try{
    const userType = res.payload.role.type;
    if(!(userType === 1 || userType === 2)){
      // if user is not admin
      return res.render("message", {
        type:"danger",
        message:"Access denied. You do not have the authority to create users.",
        link:{
          name:"Go back",
          href:"/profile/users"
        }
      })
    }
     // validate the data
     const userData = req.body;
     // avoid username dublication
     const foundUsers = await UserModel.find({username:userData.username}); // potential server error
     if(foundUsers.length > 0) { // if username is created already
      return res.render("message", {
        type:"warning",
        message:"A user by this username has already created! Try a different username.",
        link:{
          name:"Go back",
          href:"/profile/users"
        }
      })
    };
     // hash the password
     const password = await bcrypt.hash(userData.password, 10);
     // add it to the database
     const userObject = new UserModel({...userData, password}); // potential server error
     // upload the profile
     // upload image
     const imageFile = req.files['profile_photo'];
     const imageExtention = imageFile.name.split(".").reverse()[0];
     const imageName = `${generateUniqueName()}.${imageExtention}`;
     const imagePath = `./public/files/user/${imageName}`;
     await imageFile.mv(imagePath);
     userObject.profile_photo = imageName;
     //-------------------
     await userObject.save();
      res.render("message", {
        type:"success",
        message:"User has been successfully created!",
        link:{
          name:"Go back",
          href:"/profile/users"
        }
      })
   } catch (error) {
     console.log(error); //Only for debugging
       res.render("message", {
         type:"danger",
         message:"Sorry, server has failed signing you up. Please sign up later!",
         link:{
           name:"Go back",
           href:"/profile/users"
         }
       })
   }
 })
 

 router.post("/delete_user", authUser, async (req, res)=>{
   try {
      const userType = res.payload.role.type;
      const targetedUser = await UserModel.findOne(req.body, "role profile_photo");
      if(targetedUser === null){
        // if id does not exist
        return res.render("message", {
          type:"warning",
          message:"Sorry, no user with the given username found!",
          link:{
            name:"Go back",
            href:"/profile/users"
          }
        })
      }
      const targetedUserType = targetedUser.role.type;
      // ---------------
      if(targetedUserType === 1){
        // if root targeted
        return res.render("message", {
          type:"warning",
          message:"Sorry, root user cannot be deleted!",
          link:{
            name:"Go back",
            href:"/profile/users"
          }
        })
      }
      // ---------------
      if(userType === 1 || (userType === 2 && targetedUserType === 3)){
        // if auth
        const photoPath = `./public/files/user/${targetedUser.profile_photo}`;
        fs.unlink(photoPath, ()=>{});
        await targetedUser.remove();
        return res.render("message", {
          type:"success",
          message:"A user with given username is successfully deleted!",
          link:{
            name:"Go back",
            href:"/profile/users"
          }
        })
      } else {
        // if no auth
        return res.render("message", {
          type:"warning",
          message:"Sorry, you do not have the authority to delete a user!",
          link:{
            name:"Go back",
            href:"/profile/users"
          }
        })
      }
  } catch (error) {
    res.render("message", {
      type:"danger",
      message:"Sorry, server has failed. Please try again later!",
      link:{
        name:"Go back",
        href:"/profile/users"
      }
    })
   }
 })

router.post("/authorize_user", authUser, async (req, res)=>{
  try {
    const { username, toUserType } = req.body;
    const userType = res.payload.role.type;
    const targetedUser = await UserModel.findOne({username});
    // -------------------
    if(targetedUser === null){
      // if id does not exist
      return res.render("message", {
        type:"warning",
        message:"Sorry, no user with the given username found!",
        link:{
          name:"Go back",
          href:"/profile/users"
        }
      })
    }
    // -------------------
    const targetedUserType = targetedUser.role.type;
    if(targetedUserType === 1){
      // if root targeted
      return res.render("message", {
        type:"warning",
        message:"Sorry, root user cannot be changed!",
        link:{
          name:"Go back",
          href:"/profile/users"
        }
      })
    }
    // ---------------
    if(userType === 1){
      // if auth
      if(+toUserType === 2){
        targetedUser.role.roleName = "Admin";
        targetedUser.role.type = 2;
      } else if (+toUserType === 3) {
        targetedUser.role.roleName = "Blogger";
        targetedUser.role.type = 3;
      } else {
        throw "Wrong input has been given";
      }
      // -----------------
      await targetedUser.save();
      return res.render("message", {
        type:"success",
        message:"A user with given username is successfully changed!",
        link:{
          name:"Go back",
          href:"/profile/users"
        }
      })
    } else {
      // if no auth
      return res.render("message", {
        type:"warning",
        message:"Sorry, you do not have the authority to delete a user!",
        link:{
          name:"Go back",
          href:"/profile/users"
        }
      })
    }
  } catch (error) {
    res.render("message", {
      type:"danger",
      message:"Sorry, server has failed. Please try later!",
      link:{
        name:"Go back",
        href:"/profile/users"
      }
    })
  }
})




// profile_website url
router.get("/profile/website", authUser, (req, res)=>{
  res.render("profile/website", {user:res.payload})
})


// edit profile
router.get("/profile/edit_profile", authUser, (req, res)=>{
  res.render("profile/website", {user:res.payload})
})


// if wrong url is given
router.use("*", (req, res)=>{
  res.render("message", {
    type:"warning",
    message:"The given url could not be accessed. Whether it is outdated or does not exist at all. Please check again!",
    link:{
      name:"Go To Home Page",
      href:"/"
    }
  })
})




module.exports = router;