const
	chai = require( "chai" ),
	chaiHttp = require( "chai-http" ),
	should = chai.should(),
	request = require( "request" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../../src/utils/tokenGenerator" ),
	Post = require( "../../src/models/Post" ),
	Notification = require( "../../src/models/Notification" ),
	User = require( "../../src/models/User" );

dotenv.config();
chai.use( chaiHttp );
mongoose.connect( process.env.DEV_MONGODB_URL, { useNewUrlParser: true }).then(() => {
	console.log( "MongoDB connected" );
}).catch( err => console.log( err ));

describe( "POST posts/global/:skip/:limit", function() {
	var
		author,
		token;

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
	});

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
	});

	it( "gets explore posts, should return 200", function( done ) {
		chai.request( "localhost:8081" )
			.get( "/posts/global/0/10" )
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 404 for invalid route", function( done ) {
		chai.request( "localhost:8081" )
			.get( "/posts/global/" )
			.end(( err, res ) => {
				res.should.have.status( 404 );
				done();
			});
	});
});


describe( "POST posts/create", function() {
	var
		author,
		token;

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
	});

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await Post.remove({ author: author._id });
	});

	it( "creates a new post, should return 201", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/create" )
			.send({
				token: token, userInput: "test2"
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/create" )
			.send({})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 for invalid token", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/create" )
			.send({
				token: "1232312sadasd213213", userInput: "test2"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


describe( "POST posts/like", function() {
	var
		author,
		post,
		token;

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
		post = await new Post({
			author: author._id,
			content: "Like me"
		}).save();
	});

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await Post.remove({ author: author._id });
		await Notification.remove({ author: author._id });
	});

	it( "creates adds a new like, should return 201", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/like" )
			.send({
				token: token,
				postId: post._id
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/like" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/like" )
			.send({
				postId: post._id
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 for invalid token", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/like" )
			.send({
				token: "1232312sadasd213213",
				postId: post._id
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


describe( "POST posts/dislike", function() {
	var
		author,
		post,
		token;

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
		post = await new Post({
			author: author._id,
			content: "Like me"
		}).save();
	});

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await Post.remove({ author: author._id });
	});

	it( "removes a like, should return 200", function( done ) {
		chai.request( "localhost:8081" )
			.patch( "/posts/dislike" )
			.send({
				token: token,
				postId: post._id
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8081" )
			.patch( "/posts/dislike" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8081" )
			.patch( "/posts/dislike" )
			.send({
				postId: post._id
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 for invalid token", function( done ) {
		chai.request( "localhost:8081" )
			.patch( "/posts/dislike" )
			.send({
				token: "1232312sadasd213213",
				postId: post._id
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


describe( "POST posts/media", function() {
	var
		author,
		token;

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
	});

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await Post.remove({ author: author._id });
	});

	it( "creates a new post, should return 201", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/media" )
			.send({
				token: token, data: { privacyRange: 1, alerts: {} }
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/media" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/media" )
			.send({
				data: {}
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 for invalid token", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/media" )
			.send({
				token: "1232312sadasd213213",
				data: { privacyRange: 1, alerts: {} }
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});

describe( "POST posts/mediaLink", function() {
	var
		author,
		token;

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
	});

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await Post.remove({ author: author._id });
	});

	it( "creates a new post, should return 201", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/mediaLink" )
			.send({
				token: token, link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/mediaLink" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/mediaLink" )
			.send({
				link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 for invalid token", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/mediaLink" )
			.send({
				token: "1232312sadasd213213",
				link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


describe( "POST posts/mediaPicture", function() {
	var
		author,
		token;

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
	});

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await Post.remove({ author: author._id });
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/mediaPicture" )
			.send({
				picture: [ "123" ]
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/mediaPicture" )
			.send({
				token: "123asdad123123"
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});
});


describe( "GET posts/:username/:skip", function() {
	var
		author,
		token;

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
	});

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
	});

	it( "should get the user posts", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/testuser/0" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});
});



describe( "GET posts/home/:skip", function() {
	var
		author,
		token;

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
	});

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
	});

	it( "should get the user newsfeed", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/home/0" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422 Missing token", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/home/0" )
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Missing token", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/home/0" )
			.send({
				token: "123123asdasd123123"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});



describe( "DELETE posts/delete", function() {
	var
		author,
		otherUser,
		post,
		token,
		invalidToken;

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		otherUser = await new User({
			email: "test2@gmail.com",
			username: "testuser2",
			fullname: "Test User2",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
		invalidToken = tokenGenerator( otherUser );
		post = await new Post({
			author: author._id,
			content: "Delete me"
		}).save();
	});

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await User.remove({ email: "test2@gmail.com" });
		await Post.remove({ author: author._id });
	});

	it( "should return 422 Empty post data", function( done ) {
		chai.request( "localhost:8081" )
			.delete( "/posts/delete" )
			.send({
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty post data", function( done ) {
		chai.request( "localhost:8081" )
			.delete( "/posts/delete" )
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401", function( done ) {
		chai.request( "localhost:8081" )
			.delete( "/posts/delete" )
			.send({
				postId: post._id,
				token: "123123"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});

	it( "should return 500 for invalid objectId", function( done ) {
		chai.request( "localhost:8081" )
			.delete( "/posts/delete" )
			.send({
				postId: "123321",
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 500 );
				done();
			});
	});

	it( "should return 401 Requester isn't the author", function( done ) {
		chai.request( "localhost:8081" )
			.delete( "/posts/delete" )
			.send({
				postId: post._id,
				token: invalidToken
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "Unauthorized" );
				done();
			});
	});

	// must go last to avoid 404 on other tests
	it( "should return 200", function( done ) {
		chai.request( "localhost:8081" )
			.delete( "/posts/delete" )
			.send({
				postId: post._id,
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});
});



describe( "PATCH posts/update", function() {
	var
		author,
		otherUser,
		post,
		token,
		invalidToken;

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		otherUser = await new User({
			email: "test2@gmail.com",
			username: "testuser2",
			fullname: "Test User2",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
		invalidToken = tokenGenerator( otherUser );
		post = await new Post({
			author: author._id,
			content: "Update me"
		}).save();
	});

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await User.remove({ email: "test2@gmail.com" });
		await Post.remove({ author: author._id });
	});

	it( "should return 200 and update the post", function( done ) {
		chai.request( "localhost:8081" )
			.patch( "/posts/update" )
			.send({
				token: token,
				postId: post._id,
				newContent: "Updated content"
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8081" )
			.patch( "/posts/update" )
			.send({
				token: token,
				postId: 123123
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 jwt malformed", function( done ) {
		chai.request( "localhost:8081" )
			.patch( "/posts/update" )
			.send({
				token: "12312asdas123123",
				postId: post._id,
				newContent: "Updated content"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});

	it( "should return 401 Requester isn't the author", function( done ) {
		chai.request( "localhost:8081" )
			.patch( "/posts/update" )
			.send({
				token: invalidToken,
				postId: post._id,
				newContent: "Updated content"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "Unauthorized" );
				done();
			});
	});
});


describe( "POST posts/share", function() {
	var
		author,
		post,
		token;

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
		post = await new Post({
			author: author._id,
			content: "Share me"
		}).save();
	});

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await Post.remove({ author: author._id });
	});

	it( "should return 200 and share the post", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/share" )
			.send({
				token: token,
				postId: post._id,
				alerts: {},
				privacyRange: 1
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/share" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/share" )
			.send({
				postId: post._id
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8081" )
			.post( "/posts/share" )
			.send({
				token: "123213adasdsad21321321",
				postId: post._id,
				alerts: {},
				privacyRange: 1
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});
