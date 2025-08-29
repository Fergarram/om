import { css, finish, useGlobalStyles } from "../../../lib/utils.js";
import { getCameraCenter, surface } from "../desktop.js";
import { useTags } from "../../../lib/ima.js";
import sys from "../../../lib/bridge.js";
const { div, webview, video, source } = useTags();

window.addEventListener("keydown", (e) => {
	if (e.metaKey && e.key.toLowerCase() === "8") {
		addApplet("webview");
	} else if (e.metaKey && e.key.toLowerCase() === "9") {
		addApplet("video");
	}
});

useGlobalStyles(css`
	[om-applet="test"] {
		position: absolute;
		min-width: 100px;
		min-height: 100px;
		color: var(--color-white);
		background-color: var(--color-black);

		webview,
		video {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
		}

		webview {
			pointer-events: none;
		}
	}
`);

async function addApplet(mode = "webview") {
	let { x, y } = getCameraCenter();

	// Randomize width and height
	const min_size = window.innerWidth * 0.2;
	const max_size = window.innerWidth * 0.8;
	const width = min_size + Math.floor(Math.random() * (max_size - min_size));
	const height = min_size + Math.floor(Math.random() * (max_size - min_size));

	// Randomize position but keep generally centered
	const max_offset = window.innerWidth * 0.4;
	const x_offset = Math.floor(Math.random() * max_offset * 2) - max_offset;
	const y_offset = Math.floor(Math.random() * max_offset * 2) - max_offset;

	x = x - width / 2 + x_offset;
	y = y - height / 2 + y_offset;

	const video_data = videos[Math.floor(Math.random() * videos.length)];

	const { stdout, stderr } = await sys.shell.exec("ls");

	console.log(stdout, stderr);

	let media_element;

	if (mode === "webview") {
		media_element = webview({
			src: video_data.videoUrl,
			useragent:
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
		});
	} else {
		media_element = video(
			{
				controls: true,
				autoplay: true,
				loop: true,
			},
			source({
				src: video_data.videoUrl,
				type: "video/mp4",
			}),
		);
	}

	const test = div(
		{
			"om-applet": "test",
			"om-motion": "idle",
			"data-mode": mode,
			style: css`
				top: ${y}px;
				left: ${x}px;
				width: ${width}px;
				height: ${height}px;
			`,
		},
		media_element,
	);

	surface().appendChild(test);

	await finish();

	if (mode === "webview") {
		const webview_el = test.querySelector("webview");
		webview_el.setAttribute("webpreferences", "contextIsolation=yes, sandbox=yes");
	}
}

const videos = [
	{
		id: "1",
		title: "Big Buck Bunny",
		thumbnailUrl:
			"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Big_Buck_Bunny_thumbnail_vlc.png/1200px-Big_Buck_Bunny_thumbnail_vlc.png",
		duration: "8:18",
		uploadTime: "May 9, 2011",
		views: "24,969,123",
		author: "Vlc Media Player",
		videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
		description:
			"Big Buck Bunny tells the story of a giant rabbit with a heart bigger than himself. When one sunny day three rodents rudely harass him, something snaps... and the rabbit ain't no bunny anymore! In the typical cartoon tradition he prepares the nasty rodents a comical revenge.\n\nLicensed under the Creative Commons Attribution license\nhttp://www.bigbuckbunny.org",
		subscriber: "25254545 Subscribers",
		isLive: true,
	},
	{
		id: "2",
		title: "The first Blender Open Movie from 2006",
		thumbnailUrl: "https://i.ytimg.com/vi_webp/gWw23EYM9VM/maxresdefault.webp",
		duration: "12:18",
		uploadTime: "May 9, 2011",
		views: "24,969,123",
		author: "Blender Inc.",
		videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
		description:
			"Song : Raja Raja Kareja Mein Samaja\nAlbum : Raja Kareja Mein Samaja\nArtist : Radhe Shyam Rasia\nSinger : Radhe Shyam Rasia\nMusic Director : Sohan Lal, Dinesh Kumar\nLyricist : Vinay Bihari, Shailesh Sagar, Parmeshwar Premi\nMusic Label : T-Series",
		subscriber: "25254545 Subscribers",
		isLive: true,
	},
	{
		id: "3",
		title: "For Bigger Blazes",
		thumbnailUrl: "https://i.ytimg.com/vi/Dr9C2oswZfA/maxresdefault.jpg",
		duration: "8:18",
		uploadTime: "May 9, 2011",
		views: "24,969,123",
		author: "T-Series Regional",
		videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
		description:
			"Song : Raja Raja Kareja Mein Samaja\nAlbum : Raja Kareja Mein Samaja\nArtist : Radhe Shyam Rasia\nSinger : Radhe Shyam Rasia\nMusic Director : Sohan Lal, Dinesh Kumar\nLyricist : Vinay Bihari, Shailesh Sagar, Parmeshwar Premi\nMusic Label : T-Series",
		subscriber: "25254545 Subscribers",
		isLive: true,
	},
	{
		id: "4",
		title: "For Bigger Escape",
		thumbnailUrl: "https://img.jakpost.net/c/2019/09/03/2019_09_03_78912_1567484272._large.jpg",
		duration: "8:18",
		uploadTime: "May 9, 2011",
		views: "24,969,123",
		author: "T-Series Regional",
		videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
		description:
			" Introducing Chromecast. The easiest way to enjoy online video and music on your TV—for when Batman's escapes aren't quite big enough. For $35. Learn how to use Chromecast with Google Play Movies and more at google.com/chromecast.",
		subscriber: "25254545 Subscribers",
		isLive: false,
	},
	{
		id: "5",
		title: "Big Buck Bunny",
		thumbnailUrl:
			"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Big_Buck_Bunny_thumbnail_vlc.png/1200px-Big_Buck_Bunny_thumbnail_vlc.png",
		duration: "8:18",
		uploadTime: "May 9, 2011",
		views: "24,969,123",
		author: "Vlc Media Player",
		videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
		description:
			"Big Buck Bunny tells the story of a giant rabbit with a heart bigger than himself. When one sunny day three rodents rudely harass him, something snaps... and the rabbit ain't no bunny anymore! In the typical cartoon tradition he prepares the nasty rodents a comical revenge.\n\nLicensed under the Creative Commons Attribution license\nhttp://www.bigbuckbunny.org",
		subscriber: "25254545 Subscribers",
		isLive: true,
	},
	{
		id: "6",
		title: "For Bigger Blazes",
		thumbnailUrl: "https://i.ytimg.com/vi/Dr9C2oswZfA/maxresdefault.jpg",
		duration: "8:18",
		uploadTime: "May 9, 2011",
		views: "24,969,123",
		author: "T-Series Regional",
		videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
		description:
			"Song : Raja Raja Kareja Mein Samaja\nAlbum : Raja Kareja Mein Samaja\nArtist : Radhe Shyam Rasia\nSinger : Radhe Shyam Rasia\nMusic Director : Sohan Lal, Dinesh Kumar\nLyricist : Vinay Bihari, Shailesh Sagar, Parmeshwar Premi\nMusic Label : T-Series",
		subscriber: "25254545 Subscribers",
		isLive: false,
	},
	{
		id: "7",
		title: "For Bigger Escape",
		thumbnailUrl: "https://img.jakpost.net/c/2019/09/03/2019_09_03_78912_1567484272._large.jpg",
		duration: "8:18",
		uploadTime: "May 9, 2011",
		views: "24,969,123",
		author: "T-Series Regional",
		videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
		description:
			" Introducing Chromecast. The easiest way to enjoy online video and music on your TV—for when Batman's escapes aren't quite big enough. For $35. Learn how to use Chromecast with Google Play Movies and more at google.com/chromecast.",
		subscriber: "25254545 Subscribers",
		isLive: true,
	},
	{
		id: "8",
		title: "The first Blender Open Movie from 2006",
		thumbnailUrl: "https://i.ytimg.com/vi_webp/gWw23EYM9VM/maxresdefault.webp",
		duration: "12:18",
		uploadTime: "May 9, 2011",
		views: "24,969,123",
		author: "Blender Inc.",
		videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
		description:
			"Song : Raja Raja Kareja Mein Samaja\nAlbum : Raja Kareja Mein Samaja\nArtist : Radhe Shyam Rasia\nSinger : Radhe Shyam Rasia\nMusic Director : Sohan Lal, Dinesh Kumar\nLyricist : Vinay Bihari, Shailesh Sagar, Parmeshwar Premi\nMusic Label : T-Series",
		subscriber: "25254545 Subscribers",
		isLive: false,
	},
];
