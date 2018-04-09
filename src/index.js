const
	app = require( "express" )(),
	bodyParser = require( "body-parser" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	posts = require( "./routes/posts" ),
	friends = require( "./routes/friends" ),
	auth = require( "./routes/auth" );

// apply env variables
dotenv.config();

mongoose.connect( process.env.MONGODB_URL, () => console.log( "MongoDB connected" ));

app.use( bodyParser.json());
app.use( "/auth", auth );
app.use( "/posts", posts );
app.use( "/friends", friends );

// error middleware
app.use(( err, req, res, next ) => {
	console.log( err );
	if ( !err.statusCode ) {
		res.status( 500 );
	} else {
		res.status( err.statusCode );
	}
	res.send( err.message );
});

app.listen( process.env.APP_PORT, () => console.log( "App listening" ));
