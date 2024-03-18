const express = require("express");
const dotenv = require("dotenv");
const moment = require("moment");



const User = require("../model/userSchema");
const Reset = require("../model/password_resetSchema");
const Product = require("../model/productSchema");
const Cart = require("../model/cart_Schema");
const Order = require("../model/order_schema");
const GraphData = require("../model/local_Graph_Schema");
const Knowledge = require("../model/knowledge_schema");
const Product_sub = require("../model/product_subdetails");
const mongoose = require("mongoose");

const { Configuration, OpenAIApi } = require("openai");

const bcrypt = require("bcrypt");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const similarity = require("string-similarity");



//const knowledgeBase = require("./knowledge_base.json");
const fs = require("fs");
const path = require("path");

const { Types } = require('mongoose');
const { MongoClient, GridFSBucket } = require('mongodb');
const { Readable } = require('stream');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

let gfsBucket;

mongoose.connection.once('open', async () => {
    const db = mongoose.connection.db;
    gfsBucket = new GridFSBucket(db);
});

dotenv.config({ path: "config.env" });

const API = process.env.OPENAI_API_KEY;

const configuration = new Configuration({
  apiKey: API,
});

const openai = new OpenAIApi(configuration);

router.get("/", (req, res) => {
  res.send("Hello from the router");
});









//chat bot api
router.post("/message", async (req, res) => {
  console.log("I am message");
  console.log(req.body);
  const message = req.body.message;
  /*res.status(200).send({
      message:"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    });*/

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: message },
      ],
      temperature: 1,
      max_tokens: 3000,
      top_p: 1,
      frequency_penalty: 0.5,
      presence_penalty: 0,
    });
    const generatedMessage = response.data.choices[0].message.content;

    //check the knowledge base if their is an entry for the question
    const knowledgeBase = await Knowledge.find({});
    console.log(knowledgeBase);

    if (knowledgeBase.length > 0) {
      const knowledgeQuestions = knowledgeBase.flatMap((entry) =>
        entry.questions.map((q) => q.question)
      );

      // Find the best match
      const matches = similarity.findBestMatch(message, knowledgeQuestions);
      const bestMatch = matches.bestMatch;

      // Get the corresponding answer
      const matchedQuestion = knowledgeBase.find((entry) =>
        entry.questions.some((q) => q.question === bestMatch.target)
      );

      if (bestMatch.rating > 0.2 && matchedQuestion) {
        console.log("Answer exists");
        const message = matchedQuestion.questions.find(
          (q) => q.question === bestMatch.target
        ).answer;
        console.log("Answer: ", message);
      } else {
        console.log("Answer does not exist");
        const newPair = new Knowledge({
          questions: [
            {
              question: message,
              answer: generatedMessage,
            },
          ],
        });

        // Save the new pair to the database
        newPair
          .save()
          .then((savedPair) => {
            console.log(
              "New question-answer pair added successfully:",
              savedPair
            );
          })
          .catch((error) => {
            console.error("Error adding new question-answer pair:", error);
          });
      }
    } else {
      console.log("Knowledge base is empty");
      const newPair = new Knowledge({
        questions: [
          {
            question: message,
            answer: generatedMessage,
          },
        ],
      });

      // Save the new pair to the database
      newPair
        .save()
        .then((savedPair) => {
          console.log(
            "New question-answer pair added successfully:",
            savedPair
          );
        })
        .catch((error) => {
          console.error("Error adding new question-answer pair:", error);
        });
    }

    res.status(200).send({ message: generatedMessage });
  } catch (error) {
    console.error("OpenAI API Error:", error);
    res.status(500).send("Something went wrong");
  }
});













//chat bot local
router.post("/ask", async (req, res) => {
  const { question } = req.body;
  console.log(question);

  try {
    // Fetch knowledge base data
    const knowledgeBase = await Knowledge.find({});
    console.log(knowledgeBase);

    if (knowledgeBase.length > 0) {
      // Extract questions from knowledge base
      const knowledgeQuestions = knowledgeBase
        .map((entry) => entry.questions.map((q) => q.question))
        .flat();

      // Find the best match
      const matches = similarity.findBestMatch(question, knowledgeQuestions);
      const bestMatch = matches.bestMatch;

      // Get the corresponding answer
      const matchedQuestion = knowledgeBase.find((entry) =>
        entry.questions.some((q) => q.question === bestMatch.target)
      );

      if (bestMatch.rating > 0.4 && matchedQuestion) {
        const message = matchedQuestion.questions.find(
          (q) => q.question === bestMatch.target
        ).answer;
        res.json({ message });
      } else {
        const message =
          "Sorry, I couldn't find an answer to that question. Turn on the turbo mode if needed";
        res.json({ message });
      }
    } else {
      const message = "The Knowledgebase is empty";
      res.json({ message });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});












//get user
router.get("/user/:user_id", async (req, res) => {
  try {
    const userId = req.params.user_id;
    const user = await User.findOne({ _id: userId });
    // Check if the user exists
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    } else {
      return res.status(200).json(user);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});









//get user by giving email
router.post("/user", async (req, res) => {
  try {
    const { email } = req.body;
    console.log(req.body);
    const user = await User.findOne({ email });
    console.log(user);
    // Check if the user exists
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    } else {
      return res.status(200).json(user);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});










//register
router.post("/register", async (req, res) => {
  const { name, email, nid, phone, password, cpassword, location, role } =
    req.body;
  console.log(req.body);
  if (
    !name ||
    !email ||
    !nid ||
    !phone ||
    !password ||
    !cpassword ||
    !location ||
    !role
  ) {
    return res.status(422).json({ error: "Fill all field" });
  }
  try {
    const userExist = await User.findOne({ email: email });
    if (userExist) {
      return res.status(422).json({ error: "Email Exist" });
    }
    const encpassword = await bcrypt.hash(password, 12);
    const user = new User({
      name,
      email,
      nid,
      phone,
      password: encpassword,
      location,
      role,
    });
    await user.save();

    console.log("New user");
    console.log(user.role);
    console.log(user.id);

    //creating a graphdata schema for the user if he is a seller.This will be used for showing graph details
    if (user.role == "Seller") {
      try {
        const userId = user.id;
        const find_record = await GraphData.find({ seller_id: userId });
        // Check if the result is an empty array
        if (find_record.length === 0) {
          const create_record = new GraphData({
            seller_id: userId,
          });
          await create_record.save();
        }
      } catch (err) {
        console.log(err);
      }
    }

    res
      .status(200)
      .json({ message: "User Registered successfully", status: true });
  } catch (error) {
    console.log(error);
  }
});

// login
router.post("/login", async (req, res) => {
  try {
    const { email_nid, password, role } = req.body;
    if (!email_nid || !password || !role) {
      return res.status(400).json({ error: "Plz Fill the data" });
    }
    const userLogin = await User.findOne({ email: email_nid, role: role });
    const userLogin_nid = await User.findOne({ nid: email_nid, role: role });

    if (userLogin) {
      const isMatch = await bcrypt.compare(password, userLogin.password);
      if (!isMatch) {
        res.status(404).json({ error: "Invalid Credientials" });
      } else {
        if (userLogin.is_verified == true) {
          res.status(200).json({
            message: "User Signin Successfully",
            status: true,
            user_id: userLogin.id,
          });
        } else {
          res.status(301).json({ message: "user needs to verify" });
        }
      }
    } else if (userLogin_nid) {
      const isMatch = await bcrypt.compare(password, userLogin_nid.password);
      if (!isMatch) {
        console.log("Invalid Credientials");
        res.status(404).json({ error: "Invalid Credientials" });
      } else {
        if (userLogin_nid == true) {
          res.status(200).json({
            message: "User Signin Successfully",
            status: true,
            user_id: userLogin_nid.id,
          });
        } else {
          res.status(301).json({ message: "user needs to verify" });
        }
      }
    } else {
      console.log("Invalid Credientials");
      res.status(404).json({ error: "Invalid Credientials" });
    }
  } catch (error) {
    console.log(error);
  }
});

//forget password or send varification code
router.post("/forget-password", async (req, res) => {
  const { email } = req.body;
  console.log(email);

  // Generate a unique token
  //const token = crypto.randomBytes(20).toString("hex");

  const token = Math.floor(100000 + Math.random() * 900000);
  //check if user exists

  const userExist = await User.findOne({ email });
  if (userExist) {
    //first delete the existing token if any then
    await Reset.deleteOne({ email });
    //create the new token
    const reset = await new Reset({ email, token });
    await reset.save();

    // Send password reset email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: false,
      auth: {
        user: "demolink5355@gmail.com",
        pass: "khcb gflu fcjp suag",
      },
    });

    const mailOptions = {
      from: "demolink5355@gmail.com",
      to: email,
      subject: "One Time Verificaion Code",
      html: `<p>Enter the following code to the token box:</p>
             <p style="font-size: 34px; font-weight: bold;">${token}</p>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
        res.status(500).json({ message: "Error sending email" });
      } else {
        console.log("Email sent:", info.response);
        res
          .status(200)
          .json({ message: "Password reset email sent successfully" });
      }
    });
  } else {
    console.log("User not exists");
    res.status(500).json({ message: "User do no exist" });
  }
});

//verify user Token via email code
router.post("/verify-user", async (req, res) => {
  const { email, token } = req.body;
  const user_exist = await Reset.findOne({ email, token });

  if (user_exist) {
    const currentTime = new Date();
    const tokenCreationTime = user_exist.created_at;
    const timeDifferenceInMinutes =
      (currentTime - tokenCreationTime) / (1000 * 60);

    if (timeDifferenceInMinutes > 3) {
      console.log("token expired");
      res.status(300).send("Token Expired");
    } else {
      console.log("user verified");
      const user = await User.findOne({ email });
      if (user.is_verified == false) {
        await User.findOneAndUpdate(
          { email },
          { $set: { is_verified: true } },
          { new: true }
        );
      }
      //delete the token cz it has served its purpose
      await Reset.deleteOne({ email });
      res.status(200).send("User verified");
    }
  } else {
    res.status(404).send("Invalid Credintials");
    console.log("invalid");
  }
});

//update user data
router.post("/update", async (req, res) => {
  const { _id, name, email, nid, phone, password, location, role } = req.body;
  const encpassword = await bcrypt.hash(password, 12);
  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        $set: {
          name,
          email,
          nid,
          phone,
          password: encpassword,
          location,
          role,
        },
      },
      { new: true }
    );
    if (!updatedUser) {
      console.log("not updated");
      res.status(404).send("not updated");
    } else {
      console.log("updated");
      res.status(200).send("updated");
    }
  } catch (err) {
    console.log(err);
  }
});

//add product
router.post("/add_product", async (req, res) => {
  const { local_id, name, quantity, category, price, seller_id } = req.body;
  try {
    const product = new Product({
      local_id,
      name,
      quantity,
      category,
      price,
      seller_id,
    });
    await product.save();

    //create entry for the same product in the graphdata schema

    const existingGraphData = await GraphData.findOne({
      seller_id,
      "products.product_name": name,
    });
     
    if (!existingGraphData) {
      console.log("No data exists so creating new");
      const newProduct = {
        product_name: name,
        count: 0,
      };
      await GraphData.updateOne(
        { seller_id },
        { $push: { products: newProduct } }
      );
      console.log("Product added to existing record.");
    } else {
      // Product already exists, so we do nothing
      console.log("Product already exists, no action taken.");
    }

    res.status(200).json({local_id:local_id});
  } catch (err) {
    res.status(400).send("Failed to save product");
  }
});


//add image and description
router.post('/set_image_dis', upload.single('image'), async (req, res) => {
  try {
      // Get the description from the request body
      const { description, local_id, date_of } = req.body;

      // Create a new product document
      const newProduct = new Product_sub({
        local_id,
        image: req.file.buffer.toString('base64'), // Assuming you're storing the image as base64
        description,
        date_of
      });

      // Save the product to the database
      await newProduct.save();

      res.status(200).json({ message: 'Data uploaded successfully' });
  } catch (error) {
      console.error('Error handling request:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});


//get the image and descriptions
router.get('/get_image/:local_id', async (req, res) => {
  try {
    const local_id = req.params.local_id;
    console.log("i am here");
    console.log(local_id);

    // Find the product document with the matching local_id
    const details = await Product_sub.findOne({ local_id });
    const product = await Product.findOne({ local_id });
    
    // If the product is not found, return a 404 Not Found response
    if (!details) {
      console.log("Product not found");
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const base64Image = details.image;
    const name = product.name;
    const price = product.price;
    const description = details.description;
    const date_of = details.date_of;
    const date = details.createdAt;
    console.log(price);
    console.log(name);

    // Convert the base64 string to a buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // Convert the buffer to base64 string
    const imageData = imageBuffer.toString('base64');

    // Set response headers
    res.set('Content-Type', 'image/jpeg'); // Assuming JPEG image format

    // Send the image data in the response
    res.status(200).json({ image: imageData, description: description, name: name, price: price, date_of: date_of, date: moment(date).fromNow()});
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//get seller's products
router.get("/seller_products/:seller_id", async (req, res) => {
  const seller_id = req.params.seller_id;
  try {
    const data = await Product.find({ seller_id }).sort({ createdAt: -1 });
    res.status(200).send(data);
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});

//delete product
router.get("/delete_product/:product_id", async (req, res) => {
  const procduct_id = req.params.product_id;
  console.log(procduct_id);
  try {
    //also delete the same product from the GraphData first
    const details = await Product.find({ local_id: procduct_id });
    const name = details[0].name;
    const seller_id = details[0].seller_id;
    console.log(name);

    await GraphData.updateOne(
      { seller_id },
      { $pull: { products: { product_name: name } } }
    );
    //delete the details and image if exists
    const product_details = await Product_sub.findOne({local_id:procduct_id});
    if(product_details){
      await Product_sub.deleteOne({local_id:procduct_id});
    }

    // then it is deleted from the Product data
    await Product.deleteOne({local_id:procduct_id});
    res.status(200).send("deletion successfull");
  } catch (err) {
    console.log(err);
    res.status(400).send("Something went wrong");
  }
});

//update product
router.put("/update_product/:product_id", async (req, res) => {
  const product_id = req.params.product_id;
  const { quantity, price } = req.body;
  try {
    const updatedProduct = await Product.findOneAndUpdate(
      { local_id: product_id },
      { $set: { quantity, price, isVerified: false } },
      { new: true }
    );
    if (updatedProduct) {
      res.status(200).send("Product updated");
    } else {
      res.status(400).send("unable to update");
    }
  } catch (err) {
    res.status(400).send("unable to update");
  }
});

router.put("/update_product_status/:product_id", async (req, res) => {
  const product_id = req.params.product_id;
  const { is_verified } = req.body;
  console.log(is_verified);
  console.log(product_id);
  try {
    const updatedProduct = await Product.findOneAndUpdate(
      { local_id: product_id },
      { $set: { isVerified: is_verified } },
      { new: true }
    );
    if (updatedProduct) {
      res.status(200).send("Product updated");
    } else {
      res.status(400).send("unable to update");
    }
  } catch (err) {
    res.status(400).send("unable to update");
  }
});

router.get("/all_product", async (req, res) => {
  try {
    all_product = await Product.find({}).sort({ createdAt: -1 });
    res.status(200).send(all_product);
  } catch (err) {
    res.status(300).send("Unable to fetch products");
  }
});

//Cart
router.post("/add_to_cart", async (req, res) => {
  console.log("I am cart");
  console.log(req.body);
  const { buyer_id, cart_items } = req.body;

  try {
    // Check if a cart already exists for the buyer_id
    const existingCart = await Cart.findOne({ buyer_id });
    console.log(cart_items);

    if (!existingCart) {
      const newCart = new Cart({ buyer_id, cart_items });
      const savedCart = await newCart.save();
      res.status(201).json(savedCart).sort({ createdAt: -1 });
    } else {
      cart_items.forEach((cartItem) => {
        existingCart.cart_items.push(cartItem);
      });

      const updatedCart = await existingCart.save();
      res.status(201).json(updatedCart);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//number of cart item
router.get("/get_cart_digit/:buyer_id", async (req, res) => {
  const buyer_id = req.params.buyer_id;
  try {
    const buyer_cart = await Cart.findOne({ buyer_id });
    if (!buyer_cart) {
      res.status(200).json(0);
    } else {
      const length = buyer_cart.cart_items.length;
      res.status(200).json(length);
    }
  } catch (err) {
    console.log(err);
  }
});
//cart details
router.get("/get_cart_details/:buyer_id", async (req, res) => {
  const buyer_id = req.params.buyer_id;

  try {
    const buyer_cart = await Cart.findOne({ buyer_id });
    const data = buyer_cart.cart_items;
    console.log(data);
    res.status(200).json(data);
  } catch (err) {
    console.log(err);
  }
});

router.get("/delete_cart/:user_id/:cart_id", async (req, res) => {
  const item_id = req.params.cart_id;
  const buyer_id = req.params.user_id;
  console.log("I am delete heh");
  try {
    const updatedCart = await Cart.findOneAndUpdate(
      { buyer_id },
      { $pull: { cart_items: { _id: item_id } } },
      { new: true }
    );

    if (!updatedCart) {
      res.status(400).send(error);
    }
    console.log("Successfully deleted");
    res.status(200).json(updatedCart);
  } catch (error) {
    console.error("Error deleting cart item:", error);
    return { success: false, message: "Internal server error" };
  }
});

//Order

//Create Order
router.post("/create_order", async (req, res) => {
  try {
    const { userId, cartItems, billingDetails, total_amount } = req.body;

    //find the user who ordered and send him email
    const user = await User.findById({ _id: userId });
    const userEmail = user.email;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: false,
      auth: {
        user: "demolink5355@gmail.com",
        pass: "khcb gflu fcjp suag",
      },
    });

    const cartItemsFormatted = cartItems
      .map((item) => {
        return `<li>${item.name} - ${item.quantity} units at ${item.price} Taka each quantity</li>`;
      })
      .join("");

    const billingDetailsFormatted =
      `<p style="margin-bottom: 10px;"><strong>Name:</strong> ${billingDetails.name}</p>` +
      `<p style="margin-bottom: 10px;"><strong>Location:</strong> ${billingDetails.location}</p>` +
      `<p style="margin-bottom: 10px;"><strong>Phone Number:</strong> ${billingDetails.phoneNumber}</p>` +
      `<p style="margin-bottom: 10px;"><strong>Courier Charge:</strong> ${billingDetails.courierCharge} Taka</p>`;

    const mailOptions = {
      from: "demolink5355@gmail.com",
      to: userEmail,
      subject: "Purchase Confirmation",
      html:
        `<div style="font-size: 28px; color: #333; margin-bottom: 20px;">Congratulations on your purchase ${user.name}</div>` +
        `<ul style="list-style-type: none; padding: 0;">You have purchased:${cartItemsFormatted}</ul>` +
        `<div style="margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px;">` +
        `<div style="font-size: 26px; color: #555; margin-bottom: 10px;">Billing Address:</div>${billingDetailsFormatted}</div>` +
        `<p style="font-size: 18px; color: #333; margin-top: 20px;"><strong>Amount Paid:</strong> ${total_amount} Taka</p>` +
        `<p style="font-size: 16px; color: #777; margin-top: 20px;">Thank You For Using Agro-Farm Market App</p>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
        res.status(500).json({ message: "Error sending email" });
      } else {
        console.log("Email sent:", info.response);
        res
          .status(200)
          .json({ message: "Password reset email sent successfully" });
      }
    });

    console.log("cart items");
    console.log(cartItems);
    const order = new Order({
      userId: new mongoose.Types.ObjectId(userId),
      cartItems: cartItems.map((item) => ({
        product: {
          id: item.id,
          local_id: item.local_id,
          name: item.name,
          quantity: item.quantity,
          category: item.category,
          price: item.price,
          seller_id: item.seller_id,
          isVerified: item.isVerified,
        },
      })),
      billingDetails: {
        name: billingDetails.name,
        location: billingDetails.location,
        phoneNumber: billingDetails.phoneNumber,
        courierCharge: billingDetails.courierCharge,
      },
      total_amount: total_amount,
      paymentStatus: "Paid", // Assuming payment is processed at this point
      orderStatus: "Processing", // Default status
    });

    await order.save();

    //delete carts because the order is done
    await Cart.findOneAndDelete({ buyer_id: userId });

    cartItems.map(async (item) => {
      const seller_id = item.seller_id;
      const local_id = item.local_id;
      const product_name = item.name;
      const product_quantity = item.quantity;
      const price = item.price;

      //send email to each seller that a order is here

      //find the user who ordered and send him email
      const user = await User.findById({ _id: seller_id });
      const userEmail = user.email;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        secure: false,
        auth: {
          user: "demolink5355@gmail.com",
          pass: "khcb gflu fcjp suag",
        },
      });

      const billingDetailsFormatted =
        `<p><strong>Name:</strong> ${billingDetails.name}</p>` +
        `<p><strong>Location:</strong> ${billingDetails.location}</p>` +
        `<p><strong>Phone Number:</strong> ${billingDetails.phoneNumber}</p>` +
        `<p><strong>Courier Charge:</strong> ${billingDetails.courierCharge} Taka</p>`;

      const mailOptions = {
        from: "demolink5355@gmail.com",
        to: userEmail,
        subject: "New Order Placed",
        html:
          `<div style="font-size: 18px; color: #333; margin-bottom: 20px;">There is a new order from ${user.name}</div>` +
          `<ul style="list-style-type: none; padding: 0;">` +
          `<li><strong>Item purchased:</strong></li>` +
          `<li>${product_name}. Quantity: ${product_quantity} kg/liter/unit at ${price} Taka per unit</li>` +
          `</ul>` +
          `<div style="margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px;">` +
          `<div style="font-size: 16px; color: #555; margin-bottom: 10px;"><strong>Billing Address:</strong></div>${billingDetailsFormatted}</div>` +
          `<p style="font-size: 18px; color: #333; margin-top: 20px;"><strong>Amount Paid:</strong> ${
            product_quantity * price
          } Taka</p>` +
          `<p style="font-size: 16px; color: #777; margin-top: 20px;">Courier Price is cash on delivery</p>` +
          `<p style="font-size: 16px; color: #777; margin-top: 20px;">Open the app and ship the products</p>`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("Error sending email:", error);
          res.status(500).json({ message: "Error sending email" });
        } else {
          console.log("Email sent:", info.response);
          res
            .status(200)
            .json({ message: "Order confirmation email sent successfully" });
        }
      });

      //update the graphData model to keep track of the individual selling
      try {
        // Find the specific GraphData document by seller_id
        const graphData = await GraphData.findOne({ seller_id: seller_id });

        if (!graphData) {
          console.log("No GraphData found for the provided seller_id.");
          return;
        }

        // Static values for demonstration
        const staticProductName = product_name; // Example static product name
        const staticCount = product_quantity; // Example static count value

        // Update the count for the static product name
        const productIndex = graphData.products.findIndex(
          (product) => product.product_name === staticProductName
        );

        // If the product is found, update its count to the static value
        if (productIndex !== -1) {
          graphData.products[productIndex].count =
            graphData.products[productIndex].count + staticCount;
        } else {
          // Handle the case where the product is not found
          console.log(`Product not found: ${staticProductName}.`);
          // If you decide to add the missing product with the static count, uncomment the next line
          // graphData.products.push({ product_name: staticProductName, count: staticCount });
        }
        // Save the modified GraphData document
        await graphData.save();
        console.log(
          "GraphData updated successfully for product:",
          staticProductName
        );
      } catch (err) {
        console.error("Error updating GraphData:", err);
      }
      //
      const get_product_details = await Product.findOne({
        seller_id: seller_id,
        local_id: local_id,
      });

      await Product.findOneAndUpdate(
        { seller_id: item.seller_id, local_id: item.local_id },
        { $set: { quantity: get_product_details.quantity - item.quantity } },
        { new: true }
      );
    });
    res.status(201).send(order._id);
  } catch (error) {
    console.error("Error creating order: ", error);
    res
      .status(500)
      .json({ message: "Failed to create order", error: error.toString() });
  }
});

//get orderlist for specific seller

router.get("/orders/:seller_id", async (req, res) => {
  const seller_id = req.params.seller_id;
  try {
    const orders = await Order.find({
      "cartItems.product.seller_id": seller_id,
    });
    console.log(orders);
    if (orders.length > 0) {
      const ordersWithFilteredCartItems = orders.map((order) => {
        const filteredCartItems = order.cartItems.filter(
          (item) => item.product.seller_id === seller_id
        );
        return { ...order.toObject(), cartItems: filteredCartItems };
      });

      res.status(200).json(ordersWithFilteredCartItems);
    } else {
      res.status(404).json({ message: "No orders found for this seller" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//get orderlist for specific buyer

router.get("/orders_buyer/:buyer_id", async (req, res) => {
  const buyer_id = req.params.buyer_id;
  try {
    const orders = await Order.find({ userId: buyer_id });
    console.log(orders.length);
    if (orders.length > 0) {
      console.log(orders);
      res.status(200).json(orders);
    } else {
      res.status(404).json({ message: "No orders found for this seller" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

//Update order status
router.post("/update_order/:productId", async (req, res) => {
  const product_id = req.params.productId;
  console.log(product_id);
  const { status } = req.body;
  try {
    const orders = await Order.find({ "cartItems.product.id": product_id });
    if (orders.length === 0) {
      return res.status(404).send("No orders found for the given product ID");
    }

    for (const order of orders) {
      for (const item of order.cartItems) {
        if (item.product.id === product_id) {
          item.product.status = status;
        }
      }

      await order.save();
    }

    return res.status(200).send("Order status updated successfully");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
});

//Graph for individual seller
router.get("/top_product_graph/:user_id", async (req, res) => {
  const userId = req.params.user_id;
  console.log(userId);
  try {
    const getData = await GraphData.findOne({ seller_id: userId });
    if (getData) {
      res.status(200).json(getData.products);
    } else {
      res.status(404).json({ message: "No products found for this seller_id" });
    }
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the products" });
  }
});

//Graph for all users
router.get("/best_product", async (req, res) => {
  try {
    const topProducts = await GraphData.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product_name",
          count: { $sum: "$products.count" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          product_name: "$_id",
          count: "$count",
        },
      },
    ]);

    res.json(topProducts);
  } catch (error) {
    console.error("Error fetching top 5 products:", error);
    res.status(500).send("An error occurred while fetching top products.");
  }
});

//For administrator
//get seller's products unauthorized
router.get("/fetch_unauthorized_for_admin_products", async (req, res) => {
  try {
    const data = await Product.find({ isVerified: false }).sort({ createdAt: -1 });
    res.status(200).send(data);
  } catch (err) {
    console.log(err);
  }
});

router.get("/fetch_authorized_for_admin_products", async (req, res) => {
  try {
    const data = await Product.find({ isVerified: true }).sort({ createdAt: -1 });
    res.status(200).send(data);
  } catch (err) {
    console.log(err);
  }
});

router.get("/fetch_all_product", async (req, res) => {
  try {
    const data = await Product.find().sort({ createdAt: -1 });
    res.status(200).send(data);
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
//console.log("test")
