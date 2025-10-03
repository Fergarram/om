// Acorn is a tiny, fast JavaScript parser written in JavaScript.
//
// Acorn was written by Marijn Haverbeke, Ingvar Stepanyan, and
// various contributors and released under an MIT license.
//
// Git repositories for Acorn are available at
//
//     http://marijnhaverbeke.nl/git/acorn
//     https://github.com/acornjs/acorn.git
//
// Please use the [github bug tracker][ghbt] to report issues.
//
// [ghbt]: https://github.com/acornjs/acorn/issues

var qZ = (B, D) => () => (D || B((D = {
	exports: {}
}).exports, D), D.exports);
var _Q = qZ((OJ, OQ) => {
	(function(B, D) {
		typeof OJ === "object" && typeof OQ !== "undefined" ? D(OJ) : typeof define === "function" && define.amd ?
			define(["exports"], D) : (B = typeof globalThis !== "undefined" ? globalThis : B || self, D(B
				.acorn = {}))
	})(OJ, function(B) {
		var D = [509, 0, 227, 0, 150, 4, 294, 9, 1368, 2, 2, 1, 6, 3, 41, 2, 5, 0, 166, 1, 574, 3, 9, 9, 7, 9, 32,
				4, 318, 1, 80, 3, 71, 10, 50, 3, 123, 2, 54, 14, 32, 10, 3, 1, 11, 3, 46, 10, 8, 0, 46, 9, 7, 2, 37,
				13, 2, 9, 6, 1, 45, 0, 13, 2, 49, 13, 9, 3, 2, 11, 83, 11, 7, 0, 3, 0, 158, 11, 6, 9, 7, 3, 56, 1,
				2, 6, 3, 1, 3, 2, 10, 0, 11, 1, 3, 6, 4, 4, 68, 8, 2, 0, 3, 0, 2, 3, 2, 4, 2, 0, 15, 1, 83, 17, 10,
				9, 5, 0, 82, 19, 13, 9, 214, 6, 3, 8, 28, 1, 83, 16, 16, 9, 82, 12, 9, 9, 7, 19, 58, 14, 5, 9, 243,
				14, 166, 9, 71, 5, 2, 1, 3, 3, 2, 0, 2, 1, 13, 9, 120, 6, 3, 6, 4, 0, 29, 9, 41, 6, 2, 3, 9, 0, 10,
				10, 47, 15, 343, 9, 54, 7, 2, 7, 17, 9, 57, 21, 2, 13, 123, 5, 4, 0, 2, 1, 2, 6, 2, 0, 9, 9, 49, 4,
				2, 1, 2, 4, 9, 9, 330, 3, 10, 1, 2, 0, 49, 6, 4, 4, 14, 10, 5350, 0, 7, 14, 11465, 27, 2343, 9, 87,
				9, 39, 4, 60, 6, 26, 9, 535, 9, 470, 0, 2, 54, 8, 3, 82, 0, 12, 1, 19628, 1, 4178, 9, 519, 45, 3,
				22, 543, 4, 4, 5, 9, 7, 3, 6, 31, 3, 149, 2, 1418, 49, 513, 54, 5, 49, 9, 0, 15, 0, 23, 4, 2, 14,
				1361, 6, 2, 16, 3, 6, 2, 1, 2, 4, 101, 0, 161, 6, 10, 9, 357, 0, 62, 13, 499, 13, 245, 1, 2, 9, 726,
				6, 110, 6, 6, 9, 4759, 9, 787719, 239
			],
			PJ = [0, 11, 2, 25, 2, 18, 2, 1, 2, 14, 3, 13, 35, 122, 70, 52, 268, 28, 4, 48, 48, 31, 14, 29, 6, 37,
				11, 29, 3, 35, 5, 7, 2, 4, 43, 157, 19, 35, 5, 35, 5, 39, 9, 51, 13, 10, 2, 14, 2, 6, 2, 1, 2, 10,
				2, 14, 2, 6, 2, 1, 4, 51, 13, 310, 10, 21, 11, 7, 25, 5, 2, 41, 2, 8, 70, 5, 3, 0, 2, 43, 2, 1, 4,
				0, 3, 22, 11, 22, 10, 30, 66, 18, 2, 1, 11, 21, 11, 25, 71, 55, 7, 1, 65, 0, 16, 3, 2, 2, 2, 28, 43,
				28, 4, 28, 36, 7, 2, 27, 28, 53, 11, 21, 11, 18, 14, 17, 111, 72, 56, 50, 14, 50, 14, 35, 39, 27,
				10, 22, 251, 41, 7, 1, 17, 2, 60, 28, 11, 0, 9, 21, 43, 17, 47, 20, 28, 22, 13, 52, 58, 1, 3, 0, 14,
				44, 33, 24, 27, 35, 30, 0, 3, 0, 9, 34, 4, 0, 13, 47, 15, 3, 22, 0, 2, 0, 36, 17, 2, 24, 20, 1, 64,
				6, 2, 0, 2, 3, 2, 14, 2, 9, 8, 46, 39, 7, 3, 1, 3, 21, 2, 6, 2, 1, 2, 4, 4, 0, 19, 0, 13, 4, 31, 9,
				2, 0, 3, 0, 2, 37, 2, 0, 26, 0, 2, 0, 45, 52, 19, 3, 21, 2, 31, 47, 21, 1, 2, 0, 185, 46, 42, 3, 37,
				47, 21, 0, 60, 42, 14, 0, 72, 26, 38, 6, 186, 43, 117, 63, 32, 7, 3, 0, 3, 7, 2, 1, 2, 23, 16, 0, 2,
				0, 95, 7, 3, 38, 17, 0, 2, 0, 29, 0, 11, 39, 8, 0, 22, 0, 12, 45, 20, 0, 19, 72, 200, 32, 32, 8, 2,
				36, 18, 0, 50, 29, 113, 6, 2, 1, 2, 37, 22, 0, 26, 5, 2, 1, 2, 31, 15, 0, 328, 18, 16, 0, 2, 12, 2,
				33, 125, 0, 80, 921, 103, 110, 18, 195, 2637, 96, 16, 1071, 18, 5, 26, 3994, 6, 582, 6842, 29, 1763,
				568, 8, 30, 18, 78, 18, 29, 19, 47, 17, 3, 32, 20, 6, 18, 433, 44, 212, 63, 129, 74, 6, 0, 67, 12,
				65, 1, 2, 0, 29, 6135, 9, 1237, 42, 9, 8936, 3, 2, 6, 2, 1, 2, 290, 16, 0, 30, 2, 3, 0, 15, 3, 9,
				395, 2309, 106, 6, 12, 4, 8, 8, 9, 5991, 84, 2, 70, 2, 1, 3, 0, 3, 1, 3, 3, 2, 11, 2, 0, 2, 6, 2,
				64, 2, 3, 3, 7, 2, 6, 2, 27, 2, 3, 2, 4, 2, 0, 4, 6, 2, 339, 3, 24, 2, 24, 2, 30, 2, 24, 2, 30, 2,
				24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 7, 1845, 30, 7, 5, 262, 61, 147, 44, 11, 6, 17, 0, 322, 29, 19,
				43, 485, 27, 229, 29, 3, 0, 496, 6, 2, 3, 2, 1, 2, 14, 2, 196, 60, 67, 8, 0, 1205, 3, 2, 26, 2, 1,
				2, 0, 3, 0, 2, 9, 2, 3, 2, 0, 2, 0, 7, 0, 5, 0, 2, 0, 2, 0, 2, 2, 2, 1, 2, 0, 3, 0, 2, 0, 2, 0, 2,
				0, 2, 0, 2, 1, 2, 0, 3, 3, 2, 6, 2, 3, 2, 3, 2, 0, 2, 9, 2, 16, 6, 2, 2, 4, 2, 16, 4421, 42719, 33,
				4153, 7, 221, 3, 5761, 15, 7472, 16, 621, 2467, 541, 1507, 4938, 6, 4191
			],
			BQ =
			"‌‍·̀-ͯ·҃-֑҇-ׇֽֿׁׂׅׄؐ-ًؚ-٩ٰۖ-ۜ۟-۪ۤۧۨ-ۭ۰-۹ܑܰ-݊ަ-ް߀-߉߫-߽߳ࠖ-࠙ࠛ-ࠣࠥ-ࠧࠩ-࡙࠭-࡛ࢗ-࢟࣊-ࣣ࣡-ःऺ-़ा-ॏ॑-ॗॢॣ०-९ঁ-ঃ়া-ৄেৈো-্ৗৢৣ০-৯৾ਁ-ਃ਼ਾ-ੂੇੈੋ-੍ੑ੦-ੱੵઁ-ઃ઼ા-ૅે-ૉો-્ૢૣ૦-૯ૺ-૿ଁ-ଃ଼ା-ୄେୈୋ-୍୕-ୗୢୣ୦-୯ஂா-ூெ-ைொ-்ௗ௦-௯ఀ-ఄ఼ా-ౄె-ైొ-్ౕౖౢౣ౦-౯ಁ-ಃ಼ಾ-ೄೆ-ೈೊ-್ೕೖೢೣ೦-೯ೳഀ-ഃ഻഼ാ-ൄെ-ൈൊ-്ൗൢൣ൦-൯ඁ-ඃ්ා-ුූෘ-ෟ෦-෯ෲෳัิ-ฺ็-๎๐-๙ັິ-ຼ່-໎໐-໙༘༙༠-༩༹༵༷༾༿ཱ-྄྆྇ྍ-ྗྙ-ྼ࿆ါ-ှ၀-၉ၖ-ၙၞ-ၠၢ-ၤၧ-ၭၱ-ၴႂ-ႍႏ-ႝ፝-፟፩-፱ᜒ-᜕ᜲ-᜴ᝒᝓᝲᝳ឴-៓៝០-៩᠋-᠍᠏-᠙ᢩᤠ-ᤫᤰ-᤻᥆-᥏᧐-᧚ᨗ-ᨛᩕ-ᩞ᩠-᩿᩼-᪉᪐-᪙᪰-᪽ᪿ-ᫎᬀ-ᬄ᬴-᭄᭐-᭙᭫-᭳ᮀ-ᮂᮡ-ᮭ᮰-᮹᯦-᯳ᰤ-᰷᱀-᱉᱐-᱙᳐-᳔᳒-᳨᳭᳴᳷-᳹᷀-᷿‌‍‿⁀⁔⃐-⃥⃜⃡-⃰⳯-⵿⳱ⷠ-〪ⷿ-゙゚〯・꘠-꘩꙯ꙴ-꙽ꚞꚟ꛰꛱ꠂ꠆ꠋꠣ-ꠧ꠬ꢀꢁꢴ-ꣅ꣐-꣙꣠-꣱ꣿ-꤉ꤦ-꤭ꥇ-꥓ꦀ-ꦃ꦳-꧀꧐-꧙ꧥ꧰-꧹ꨩ-ꨶꩃꩌꩍ꩐-꩙ꩻ-ꩽꪰꪲ-ꪴꪷꪸꪾ꪿꫁ꫫ-ꫯꫵ꫶ꯣ-ꯪ꯬꯭꯰-꯹ﬞ︀-️︠-︯︳︴﹍-﹏０-９＿･",
			kJ =
			"ªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽͿΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԯԱ-Ֆՙՠ-ֈא-תׯ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࡠ-ࡪࡰ-ࢇࢉ-ࢎࢠ-ࣉऄ-हऽॐक़-ॡॱ-ঀঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱৼਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡૹଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-హఽౘ-ౚౝౠౡಀಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೝೞೠೡೱೲഄ-ഌഎ-ഐഒ-ഺഽൎൔ-ൖൟ-ൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄຆ-ຊຌ-ຣລວ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏽᏸ-ᏽᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-ᜑᜟ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡸᢀ-ᢨᢪᢰ-ᣵᤀ-ᤞᥐ-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭌᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᲀ-ᲊᲐ-ᲺᲽ-Ჿᳩ-ᳬᳮ-ᳳᳵᳶᳺᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕ℘-ℝℤΩℨK-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞ々-〇〡-〩〱-〵〸-〼ぁ-ゖ゛-ゟァ-ヺー-ヿㄅ-ㄯㄱ-ㆎㆠ-ㆿㇰ-ㇿ㐀-䶿一-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚝꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-ꟍꟐꟑꟓꟕ-Ƛꟲ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꣽꣾꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꧠ-ꧤꧦ-ꧯꧺ-ꧾꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꩾ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭩꭰ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ",
			_J = {
				3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
				5: "class enum extends super const export import",
				6: "enum",
				strict: "implements interface let package private protected public static yield",
				strictBind: "eval arguments"
			},
			BJ =
			"break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this",
			UQ = {
				5: BJ,
				"5module": BJ + " export import",
				6: BJ + " const class extends export import super"
			},
			NQ = /^in(stanceof)?$/,
			$Q = new RegExp("[" + kJ + "]"),
			IQ = new RegExp("[" + kJ + BQ + "]");

		function UJ(J, Q) {
			var Z = 65536;
			for (var q = 0; q < Q.length; q += 2) {
				if (Z += Q[q], Z > J) return !1;
				if (Z += Q[q + 1], Z >= J) return !0
			}
			return !1
		}

		function T(J, Q) {
			if (J < 65) return J === 36;
			if (J < 91) return !0;
			if (J < 97) return J === 95;
			if (J < 123) return !0;
			if (J <= 65535) return J >= 170 && $Q.test(String.fromCharCode(J));
			if (Q === !1) return !1;
			return UJ(J, PJ)
		}

		function x(J, Q) {
			if (J < 48) return J === 36;
			if (J < 58) return !0;
			if (J < 65) return !1;
			if (J < 91) return !0;
			if (J < 97) return J === 95;
			if (J < 123) return !0;
			if (J <= 65535) return J >= 170 && IQ.test(String.fromCharCode(J));
			if (Q === !1) return !1;
			return UJ(J, PJ) || UJ(J, D)
		}
		var _ = function J(Q, Z) {
			if (Z === void 0) Z = {};
			this.label = Q, this.keyword = Z.keyword, this.beforeExpr = !!Z.beforeExpr, this.startsExpr = !!Z
				.startsExpr, this.isLoop = !!Z.isLoop, this.isAssign = !!Z.isAssign, this.prefix = !!Z.prefix,
				this.postfix = !!Z.postfix, this.binop = Z.binop || null, this.updateContext = null
		};

		function w(J, Q) {
			return new _(J, {
				beforeExpr: !0,
				binop: Q
			})
		}
		var S = {
				beforeExpr: !0
			},
			C = {
				startsExpr: !0
			},
			WJ = {};

		function O(J, Q) {
			if (Q === void 0) Q = {};
			return Q.keyword = J, WJ[J] = new _(J, Q)
		}
		var W = {
				num: new _("num", C),
				regexp: new _("regexp", C),
				string: new _("string", C),
				name: new _("name", C),
				privateId: new _("privateId", C),
				eof: new _("eof"),
				bracketL: new _("[", {
					beforeExpr: !0,
					startsExpr: !0
				}),
				bracketR: new _("]"),
				braceL: new _("{", {
					beforeExpr: !0,
					startsExpr: !0
				}),
				braceR: new _("}"),
				parenL: new _("(", {
					beforeExpr: !0,
					startsExpr: !0
				}),
				parenR: new _(")"),
				comma: new _(",", S),
				semi: new _(";", S),
				colon: new _(":", S),
				dot: new _("."),
				question: new _("?", S),
				questionDot: new _("?."),
				arrow: new _("=>", S),
				template: new _("template"),
				invalidTemplate: new _("invalidTemplate"),
				ellipsis: new _("...", S),
				backQuote: new _("`", C),
				dollarBraceL: new _("${", {
					beforeExpr: !0,
					startsExpr: !0
				}),
				eq: new _("=", {
					beforeExpr: !0,
					isAssign: !0
				}),
				assign: new _("_=", {
					beforeExpr: !0,
					isAssign: !0
				}),
				incDec: new _("++/--", {
					prefix: !0,
					postfix: !0,
					startsExpr: !0
				}),
				prefix: new _("!/~", {
					beforeExpr: !0,
					prefix: !0,
					startsExpr: !0
				}),
				logicalOR: w("||", 1),
				logicalAND: w("&&", 2),
				bitwiseOR: w("|", 3),
				bitwiseXOR: w("^", 4),
				bitwiseAND: w("&", 5),
				equality: w("==/!=/===/!==", 6),
				relational: w("</>/<=/>=", 7),
				bitShift: w("<</>>/>>>", 8),
				plusMin: new _("+/-", {
					beforeExpr: !0,
					binop: 9,
					prefix: !0,
					startsExpr: !0
				}),
				modulo: w("%", 10),
				star: w("*", 10),
				slash: w("/", 10),
				starstar: new _("**", {
					beforeExpr: !0
				}),
				coalesce: w("??", 1),
				_break: O("break"),
				_case: O("case", S),
				_catch: O("catch"),
				_continue: O("continue"),
				_debugger: O("debugger"),
				_default: O("default", S),
				_do: O("do", {
					isLoop: !0,
					beforeExpr: !0
				}),
				_else: O("else", S),
				_finally: O("finally"),
				_for: O("for", {
					isLoop: !0
				}),
				_function: O("function", C),
				_if: O("if"),
				_return: O("return", S),
				_switch: O("switch"),
				_throw: O("throw", S),
				_try: O("try"),
				_var: O("var"),
				_const: O("const"),
				_while: O("while", {
					isLoop: !0
				}),
				_with: O("with"),
				_new: O("new", {
					beforeExpr: !0,
					startsExpr: !0
				}),
				_this: O("this", C),
				_super: O("super", C),
				_class: O("class", C),
				_extends: O("extends", S),
				_export: O("export"),
				_import: O("import", C),
				_null: O("null", C),
				_true: O("true", C),
				_false: O("false", C),
				_in: O("in", {
					beforeExpr: !0,
					binop: 7
				}),
				_instanceof: O("instanceof", {
					beforeExpr: !0,
					binop: 7
				}),
				_typeof: O("typeof", {
					beforeExpr: !0,
					prefix: !0,
					startsExpr: !0
				}),
				_void: O("void", {
					beforeExpr: !0,
					prefix: !0,
					startsExpr: !0
				}),
				_delete: O("delete", {
					beforeExpr: !0,
					prefix: !0,
					startsExpr: !0
				})
			},
			b = /\r\n?|\n|\u2028|\u2029/,
			TJ = new RegExp(b.source, "g");

		function l(J) {
			return J === 10 || J === 13 || J === 8232 || J === 8233
		}

		function DJ(J, Q, Z) {
			if (Z === void 0) Z = J.length;
			for (var q = Q; q < Z; q++) {
				var X = J.charCodeAt(q);
				if (l(X)) return q < Z - 1 && X === 13 && J.charCodeAt(q + 1) === 10 ? q + 2 : q + 1
			}
			return -1
		}
		var NJ = /[\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]/,
			I = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g,
			EJ = Object.prototype,
			vQ = EJ.hasOwnProperty,
			bQ = EJ.toString,
			c = Object.hasOwn || function(J, Q) {
				return vQ.call(J, Q)
			},
			yJ = Array.isArray || function(J) {
				return bQ.call(J) === "[object Array]"
			},
			xJ = Object.create(null);

		function f(J) {
			return xJ[J] || (xJ[J] = new RegExp("^(?:" + J.replace(/ /g, "|") + ")$"))
		}

		function g(J) {
			if (J <= 65535) return String.fromCharCode(J);
			return J -= 65536, String.fromCharCode((J >> 10) + 55296, (J & 1023) + 56320)
		}
		var AQ = /(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/,
			d = function J(Q, Z) {
				this.line = Q, this.column = Z
			};
		d.prototype.offset = function J(Q) {
			return new d(this.line, this.column + Q)
		};
		var s = function J(Q, Z, q) {
			if (this.start = Z, this.end = q, Q.sourceFile !== null) this.source = Q.sourceFile
		};

		function $J(J, Q) {
			for (var Z = 1, q = 0;;) {
				var X = DJ(J, q, Q);
				if (X < 0) return new d(Z, Q - q);
				++Z, q = X
			}
		}
		var XJ = {
				ecmaVersion: null,
				sourceType: "script",
				onInsertedSemicolon: null,
				onTrailingComma: null,
				allowReserved: null,
				allowReturnOutsideFunction: !1,
				allowImportExportEverywhere: !1,
				allowAwaitOutsideFunction: null,
				allowSuperOutsideMethod: null,
				allowHashBang: !1,
				checkPrivateFields: !0,
				locations: !1,
				onToken: null,
				onComment: null,
				ranges: !1,
				program: null,
				sourceFile: null,
				directSourceFile: null,
				preserveParens: !1
			},
			gJ = !1;

		function CQ(J) {
			var Q = {};
			for (var Z in XJ) Q[Z] = J && c(J, Z) ? J[Z] : XJ[Z];
			if (Q.ecmaVersion === "latest") Q.ecmaVersion = 1e8;
			else if (Q.ecmaVersion == null) {
				if (!gJ && typeof console === "object" && console.warn) gJ = !0, console.warn(`Since Acorn 8.0.0, options.ecmaVersion is required.
Defaulting to 2020, but this will stop working in the future.`);
				Q.ecmaVersion = 11
			} else if (Q.ecmaVersion >= 2015) Q.ecmaVersion -= 2009;
			if (Q.allowReserved == null) Q.allowReserved = Q.ecmaVersion < 5;
			if (!J || J.allowHashBang == null) Q.allowHashBang = Q.ecmaVersion >= 14;
			if (yJ(Q.onToken)) {
				var q = Q.onToken;
				Q.onToken = function(X) {
					return q.push(X)
				}
			}
			if (yJ(Q.onComment)) Q.onComment = wQ(Q, Q.onComment);
			return Q
		}

		function wQ(J, Q) {
			return function(Z, q, X, Y, j, H) {
				var K = {
					type: Z ? "Block" : "Line",
					value: q,
					start: X,
					end: Y
				};
				if (J.locations) K.loc = new s(this, j, H);
				if (J.ranges) K.range = [X, Y];
				Q.push(K)
			}
		}
		var t = 1,
			i = 2,
			IJ = 4,
			mJ = 8,
			vJ = 16,
			hJ = 32,
			YJ = 64,
			fJ = 128,
			p = 256,
			e = 512,
			jJ = t | i | p;

		function bJ(J, Q) {
			return i | (J ? IJ : 0) | (Q ? mJ : 0)
		}
		var HJ = 0,
			AJ = 1,
			m = 2,
			uJ = 3,
			lJ = 4,
			pJ = 5,
			$ = function J(Q, Z, q) {
				this.options = Q = CQ(Q), this.sourceFile = Q.sourceFile, this.keywords = f(UQ[Q.ecmaVersion >= 6 ?
					6 : Q.sourceType === "module" ? "5module" : 5]);
				var X = "";
				if (Q.allowReserved !== !0) {
					if (X = _J[Q.ecmaVersion >= 6 ? 6 : Q.ecmaVersion === 5 ? 5 : 3], Q.sourceType === "module")
						X += " await"
				}
				this.reservedWords = f(X);
				var Y = (X ? X + " " : "") + _J.strict;
				if (this.reservedWordsStrict = f(Y), this.reservedWordsStrictBind = f(Y + " " + _J.strictBind), this
					.input = String(Z), this.containsEsc = !1, q) this.pos = q, this.lineStart = this.input
					.lastIndexOf(`
`, q - 1) + 1, this.curLine = this.input.slice(0, this.lineStart).split(b).length;
				else this.pos = this.lineStart = 0, this.curLine = 1;
				if (this.type = W.eof, this.value = null, this.start = this.end = this.pos, this.startLoc = this
					.endLoc = this.curPosition(), this.lastTokEndLoc = this.lastTokStartLoc = null, this
					.lastTokStart = this.lastTokEnd = this.pos, this.context = this.initialContext(), this
					.exprAllowed = !0, this.inModule = Q.sourceType === "module", this.strict = this.inModule ||
					this.strictDirective(this.pos), this.potentialArrowAt = -1, this.potentialArrowInForAwait = !1,
					this.yieldPos = this.awaitPos = this.awaitIdentPos = 0, this.labels = [], this
					.undefinedExports = Object.create(null), this.pos === 0 && Q.allowHashBang && this.input.slice(
						0, 2) === "#!") this.skipLineComment(2);
				this.scopeStack = [], this.enterScope(t), this.regexpState = null, this.privateNameStack = []
			},
			E = {
				inFunction: {
					configurable: !0
				},
				inGenerator: {
					configurable: !0
				},
				inAsync: {
					configurable: !0
				},
				canAwait: {
					configurable: !0
				},
				allowSuper: {
					configurable: !0
				},
				allowDirectSuper: {
					configurable: !0
				},
				treatFunctionsAsVar: {
					configurable: !0
				},
				allowNewDotTarget: {
					configurable: !0
				},
				inClassStaticBlock: {
					configurable: !0
				}
			};
		$.prototype.parse = function J() {
			var Q = this.options.program || this.startNode();
			return this.nextToken(), this.parseTopLevel(Q)
		}, E.inFunction.get = function() {
			return (this.currentVarScope().flags & i) > 0
		}, E.inGenerator.get = function() {
			return (this.currentVarScope().flags & mJ) > 0
		}, E.inAsync.get = function() {
			return (this.currentVarScope().flags & IJ) > 0
		}, E.canAwait.get = function() {
			for (var J = this.scopeStack.length - 1; J >= 0; J--) {
				var Q = this.scopeStack[J],
					Z = Q.flags;
				if (Z & (p | e)) return !1;
				if (Z & i) return (Z & IJ) > 0
			}
			return this.inModule && this.options.ecmaVersion >= 13 || this.options.allowAwaitOutsideFunction
		}, E.allowSuper.get = function() {
			var J = this.currentThisScope(),
				Q = J.flags;
			return (Q & YJ) > 0 || this.options.allowSuperOutsideMethod
		}, E.allowDirectSuper.get = function() {
			return (this.currentThisScope().flags & fJ) > 0
		}, E.treatFunctionsAsVar.get = function() {
			return this.treatFunctionsAsVarInScope(this.currentScope())
		}, E.allowNewDotTarget.get = function() {
			for (var J = this.scopeStack.length - 1; J >= 0; J--) {
				var Q = this.scopeStack[J],
					Z = Q.flags;
				if (Z & (p | e) || Z & i && !(Z & vJ)) return !0
			}
			return !1
		}, E.inClassStaticBlock.get = function() {
			return (this.currentVarScope().flags & p) > 0
		}, $.extend = function J() {
			var Q = [],
				Z = arguments.length;
			while (Z--) Q[Z] = arguments[Z];
			var q = this;
			for (var X = 0; X < Q.length; X++) q = Q[X](q);
			return q
		}, $.parse = function J(Q, Z) {
			return new this(Z, Q).parse()
		}, $.parseExpressionAt = function J(Q, Z, q) {
			var X = new this(q, Q, Z);
			return X.nextToken(), X.parseExpression()
		}, $.tokenizer = function J(Q, Z) {
			return new this(Z, Q)
		}, Object.defineProperties($.prototype, E);
		var A = $.prototype,
			SQ = /^(?:'((?:\\[^]|[^'\\])*?)'|"((?:\\[^]|[^"\\])*?)")/;
		A.strictDirective = function(J) {
			if (this.options.ecmaVersion < 5) return !1;
			for (;;) {
				I.lastIndex = J, J += I.exec(this.input)[0].length;
				var Q = SQ.exec(this.input.slice(J));
				if (!Q) return !1;
				if ((Q[1] || Q[2]) === "use strict") {
					I.lastIndex = J + Q[0].length;
					var Z = I.exec(this.input),
						q = Z.index + Z[0].length,
						X = this.input.charAt(q);
					return X === ";" || X === "}" || b.test(Z[0]) && !(/[(`.[+\-/*%<>=,?^&]/.test(X) || X ===
						"!" && this.input.charAt(q + 1) === "=")
				}
				if (J += Q[0].length, I.lastIndex = J, J += I.exec(this.input)[0].length, this.input[J] === ";")
					J++
			}
		}, A.eat = function(J) {
			if (this.type === J) return this.next(), !0;
			else return !1
		}, A.isContextual = function(J) {
			return this.type === W.name && this.value === J && !this.containsEsc
		}, A.eatContextual = function(J) {
			if (!this.isContextual(J)) return !1;
			return this.next(), !0
		}, A.expectContextual = function(J) {
			if (!this.eatContextual(J)) this.unexpected()
		}, A.canInsertSemicolon = function() {
			return this.type === W.eof || this.type === W.braceR || b.test(this.input.slice(this.lastTokEnd,
				this.start))
		}, A.insertSemicolon = function() {
			if (this.canInsertSemicolon()) {
				if (this.options.onInsertedSemicolon) this.options.onInsertedSemicolon(this.lastTokEnd, this
					.lastTokEndLoc);
				return !0
			}
		}, A.semicolon = function() {
			if (!this.eat(W.semi) && !this.insertSemicolon()) this.unexpected()
		}, A.afterTrailingComma = function(J, Q) {
			if (this.type === J) {
				if (this.options.onTrailingComma) this.options.onTrailingComma(this.lastTokStart, this
					.lastTokStartLoc);
				if (!Q) this.next();
				return !0
			}
		}, A.expect = function(J) {
			this.eat(J) || this.unexpected()
		}, A.unexpected = function(J) {
			this.raise(J != null ? J : this.start, "Unexpected token")
		};
		var KJ = function J() {
			this.shorthandAssign = this.trailingComma = this.parenthesizedAssign = this.parenthesizedBind = this
				.doubleProto = -1
		};
		A.checkPatternErrors = function(J, Q) {
			if (!J) return;
			if (J.trailingComma > -1) this.raiseRecoverable(J.trailingComma,
				"Comma is not permitted after the rest element");
			var Z = Q ? J.parenthesizedAssign : J.parenthesizedBind;
			if (Z > -1) this.raiseRecoverable(Z, Q ? "Assigning to rvalue" : "Parenthesized pattern")
		}, A.checkExpressionErrors = function(J, Q) {
			if (!J) return !1;
			var {
				shorthandAssign: Z,
				doubleProto: q
			} = J;
			if (!Q) return Z >= 0 || q >= 0;
			if (Z >= 0) this.raise(Z,
			"Shorthand property assignments are valid only in destructuring patterns");
			if (q >= 0) this.raiseRecoverable(q, "Redefinition of __proto__ property")
		}, A.checkYieldAwaitInDefaultParams = function() {
			if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos)) this.raise(this.yieldPos,
				"Yield expression cannot be a default value");
			if (this.awaitPos) this.raise(this.awaitPos, "Await expression cannot be a default value")
		}, A.isSimpleAssignTarget = function(J) {
			if (J.type === "ParenthesizedExpression") return this.isSimpleAssignTarget(J.expression);
			return J.type === "Identifier" || J.type === "MemberExpression"
		};
		var G = $.prototype;
		G.parseTopLevel = function(J) {
			var Q = Object.create(null);
			if (!J.body) J.body = [];
			while (this.type !== W.eof) {
				var Z = this.parseStatement(null, !0, Q);
				J.body.push(Z)
			}
			if (this.inModule)
				for (var q = 0, X = Object.keys(this.undefinedExports); q < X.length; q += 1) {
					var Y = X[q];
					this.raiseRecoverable(this.undefinedExports[Y].start, "Export '" + Y + "' is not defined")
				}
			return this.adaptDirectivePrologue(J.body), this.next(), J.sourceType = this.options.sourceType,
				this.finishNode(J, "Program")
		};
		var CJ = {
				kind: "loop"
			},
			LQ = {
				kind: "switch"
			};
		G.isLet = function(J) {
			if (this.options.ecmaVersion < 6 || !this.isContextual("let")) return !1;
			I.lastIndex = this.pos;
			var Q = I.exec(this.input),
				Z = this.pos + Q[0].length,
				q = this.input.charCodeAt(Z);
			if (q === 91 || q === 92) return !0;
			if (J) return !1;
			if (q === 123 || q > 55295 && q < 56320) return !0;
			if (T(q, !0)) {
				var X = Z + 1;
				while (x(q = this.input.charCodeAt(X), !0)) ++X;
				if (q === 92 || q > 55295 && q < 56320) return !0;
				var Y = this.input.slice(Z, X);
				if (!NQ.test(Y)) return !0
			}
			return !1
		}, G.isAsyncFunction = function() {
			if (this.options.ecmaVersion < 8 || !this.isContextual("async")) return !1;
			I.lastIndex = this.pos;
			var J = I.exec(this.input),
				Q = this.pos + J[0].length,
				Z;
			return !b.test(this.input.slice(this.pos, Q)) && this.input.slice(Q, Q + 8) === "function" && (Q +
				8 === this.input.length || !(x(Z = this.input.charCodeAt(Q + 8)) || Z > 55295 && Z < 56320))
		}, G.isUsingKeyword = function(J, Q) {
			if (this.options.ecmaVersion < 17 || !this.isContextual(J ? "await" : "using")) return !1;
			I.lastIndex = this.pos;
			var Z = I.exec(this.input),
				q = this.pos + Z[0].length;
			if (b.test(this.input.slice(this.pos, q))) return !1;
			if (J) {
				var X = q + 5,
					Y;
				if (this.input.slice(q, X) !== "using" || X === this.input.length || x(Y = this.input
						.charCodeAt(X)) || Y > 55295 && Y < 56320) return !1;
				I.lastIndex = X;
				var j = I.exec(this.input);
				if (j && b.test(this.input.slice(X, X + j[0].length))) return !1
			}
			if (Q) {
				var H = q + 2,
					K;
				if (this.input.slice(q, H) === "of") {
					if (H === this.input.length || !x(K = this.input.charCodeAt(H)) && !(K > 55295 && K <
						56320)) return !1
				}
			}
			var R = this.input.charCodeAt(q);
			return T(R, !0) || R === 92
		}, G.isAwaitUsing = function(J) {
			return this.isUsingKeyword(!0, J)
		}, G.isUsing = function(J) {
			return this.isUsingKeyword(!1, J)
		}, G.parseStatement = function(J, Q, Z) {
			var q = this.type,
				X = this.startNode(),
				Y;
			if (this.isLet(J)) q = W._var, Y = "let";
			switch (q) {
				case W._break:
				case W._continue:
					return this.parseBreakContinueStatement(X, q.keyword);
				case W._debugger:
					return this.parseDebuggerStatement(X);
				case W._do:
					return this.parseDoStatement(X);
				case W._for:
					return this.parseForStatement(X);
				case W._function:
					if (J && (this.strict || J !== "if" && J !== "label") && this.options.ecmaVersion >= 6) this
						.unexpected();
					return this.parseFunctionStatement(X, !1, !J);
				case W._class:
					if (J) this.unexpected();
					return this.parseClass(X, !0);
				case W._if:
					return this.parseIfStatement(X);
				case W._return:
					return this.parseReturnStatement(X);
				case W._switch:
					return this.parseSwitchStatement(X);
				case W._throw:
					return this.parseThrowStatement(X);
				case W._try:
					return this.parseTryStatement(X);
				case W._const:
				case W._var:
					if (Y = Y || this.value, J && Y !== "var") this.unexpected();
					return this.parseVarStatement(X, Y);
				case W._while:
					return this.parseWhileStatement(X);
				case W._with:
					return this.parseWithStatement(X);
				case W.braceL:
					return this.parseBlock(!0, X);
				case W.semi:
					return this.parseEmptyStatement(X);
				case W._export:
				case W._import:
					if (this.options.ecmaVersion > 10 && q === W._import) {
						I.lastIndex = this.pos;
						var j = I.exec(this.input),
							H = this.pos + j[0].length,
							K = this.input.charCodeAt(H);
						if (K === 40 || K === 46) return this.parseExpressionStatement(X, this
						.parseExpression())
					}
					if (!this.options.allowImportExportEverywhere) {
						if (!Q) this.raise(this.start,
						"'import' and 'export' may only appear at the top level");
						if (!this.inModule) this.raise(this.start,
							"'import' and 'export' may appear only with 'sourceType: module'")
					}
					return q === W._import ? this.parseImport(X) : this.parseExport(X, Z);
				default:
					if (this.isAsyncFunction()) {
						if (J) this.unexpected();
						return this.next(), this.parseFunctionStatement(X, !0, !J)
					}
					var R = this.isAwaitUsing(!1) ? "await using" : this.isUsing(!1) ? "using" : null;
					if (R) {
						if (Q && this.options.sourceType === "script") this.raise(this.start,
							"Using declaration cannot appear in the top level when source type is `script`");
						if (R === "await using") {
							if (!this.canAwait) this.raise(this.start,
								"Await using cannot appear outside of async function");
							this.next()
						}
						return this.next(), this.parseVar(X, !1, R), this.semicolon(), this.finishNode(X,
							"VariableDeclaration")
					}
					var M = this.value,
						N = this.parseExpression();
					if (q === W.name && N.type === "Identifier" && this.eat(W.colon)) return this
						.parseLabeledStatement(X, M, N, J);
					else return this.parseExpressionStatement(X, N)
			}
		}, G.parseBreakContinueStatement = function(J, Q) {
			var Z = Q === "break";
			if (this.next(), this.eat(W.semi) || this.insertSemicolon()) J.label = null;
			else if (this.type !== W.name) this.unexpected();
			else J.label = this.parseIdent(), this.semicolon();
			var q = 0;
			for (; q < this.labels.length; ++q) {
				var X = this.labels[q];
				if (J.label == null || X.name === J.label.name) {
					if (X.kind != null && (Z || X.kind === "loop")) break;
					if (J.label && Z) break
				}
			}
			if (q === this.labels.length) this.raise(J.start, "Unsyntactic " + Q);
			return this.finishNode(J, Z ? "BreakStatement" : "ContinueStatement")
		}, G.parseDebuggerStatement = function(J) {
			return this.next(), this.semicolon(), this.finishNode(J, "DebuggerStatement")
		}, G.parseDoStatement = function(J) {
			if (this.next(), this.labels.push(CJ), J.body = this.parseStatement("do"), this.labels.pop(), this
				.expect(W._while), J.test = this.parseParenExpression(), this.options.ecmaVersion >= 6) this
				.eat(W.semi);
			else this.semicolon();
			return this.finishNode(J, "DoWhileStatement")
		}, G.parseForStatement = function(J) {
			this.next();
			var Q = this.options.ecmaVersion >= 9 && this.canAwait && this.eatContextual("await") ? this
				.lastTokStart : -1;
			if (this.labels.push(CJ), this.enterScope(0), this.expect(W.parenL), this.type === W.semi) {
				if (Q > -1) this.unexpected(Q);
				return this.parseFor(J, null)
			}
			var Z = this.isLet();
			if (this.type === W._var || this.type === W._const || Z) {
				var q = this.startNode(),
					X = Z ? "let" : this.value;
				return this.next(), this.parseVar(q, !0, X), this.finishNode(q, "VariableDeclaration"), this
					.parseForAfterInit(J, q, Q)
			}
			var Y = this.isContextual("let"),
				j = !1,
				H = this.isUsing(!0) ? "using" : this.isAwaitUsing(!0) ? "await using" : null;
			if (H) {
				var K = this.startNode();
				if (this.next(), H === "await using") this.next();
				return this.parseVar(K, !0, H), this.finishNode(K, "VariableDeclaration"), this
					.parseForAfterInit(J, K, Q)
			}
			var R = this.containsEsc,
				M = new KJ,
				N = this.start,
				v = Q > -1 ? this.parseExprSubscripts(M, "await") : this.parseExpression(!0, M);
			if (this.type === W._in || (j = this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
				if (Q > -1) {
					if (this.type === W._in) this.unexpected(Q);
					J.await = !0
				} else if (j && this.options.ecmaVersion >= 8) {
					if (v.start === N && !R && v.type === "Identifier" && v.name === "async") this.unexpected();
					else if (this.options.ecmaVersion >= 9) J.await = !1
				}
				if (Y && j) this.raise(v.start,
				"The left-hand side of a for-of loop may not start with 'let'.");
				return this.toAssignable(v, !1, M), this.checkLValPattern(v), this.parseForIn(J, v)
			} else this.checkExpressionErrors(M, !0);
			if (Q > -1) this.unexpected(Q);
			return this.parseFor(J, v)
		}, G.parseForAfterInit = function(J, Q, Z) {
			if ((this.type === W._in || this.options.ecmaVersion >= 6 && this.isContextual("of")) && Q
				.declarations.length === 1) {
				if (this.options.ecmaVersion >= 9)
					if (this.type === W._in) {
						if (Z > -1) this.unexpected(Z)
					} else J.await = Z > -1;
				return this.parseForIn(J, Q)
			}
			if (Z > -1) this.unexpected(Z);
			return this.parseFor(J, Q)
		}, G.parseFunctionStatement = function(J, Q, Z) {
			return this.next(), this.parseFunction(J, JJ | (Z ? 0 : wJ), !1, Q)
		}, G.parseIfStatement = function(J) {
			return this.next(), J.test = this.parseParenExpression(), J.consequent = this.parseStatement("if"),
				J.alternate = this.eat(W._else) ? this.parseStatement("if") : null, this.finishNode(J,
					"IfStatement")
		}, G.parseReturnStatement = function(J) {
			if (!this.inFunction && !this.options.allowReturnOutsideFunction) this.raise(this.start,
				"'return' outside of function");
			if (this.next(), this.eat(W.semi) || this.insertSemicolon()) J.argument = null;
			else J.argument = this.parseExpression(), this.semicolon();
			return this.finishNode(J, "ReturnStatement")
		}, G.parseSwitchStatement = function(J) {
			this.next(), J.discriminant = this.parseParenExpression(), J.cases = [], this.expect(W.braceL), this
				.labels.push(LQ), this.enterScope(0);
			var Q;
			for (var Z = !1; this.type !== W.braceR;)
				if (this.type === W._case || this.type === W._default) {
					var q = this.type === W._case;
					if (Q) this.finishNode(Q, "SwitchCase");
					if (J.cases.push(Q = this.startNode()), Q.consequent = [], this.next(), q) Q.test = this
						.parseExpression();
					else {
						if (Z) this.raiseRecoverable(this.lastTokStart, "Multiple default clauses");
						Z = !0, Q.test = null
					}
					this.expect(W.colon)
				} else {
					if (!Q) this.unexpected();
					Q.consequent.push(this.parseStatement(null))
				} if (this.exitScope(), Q) this.finishNode(Q, "SwitchCase");
			return this.next(), this.labels.pop(), this.finishNode(J, "SwitchStatement")
		}, G.parseThrowStatement = function(J) {
			if (this.next(), b.test(this.input.slice(this.lastTokEnd, this.start))) this.raise(this.lastTokEnd,
				"Illegal newline after throw");
			return J.argument = this.parseExpression(), this.semicolon(), this.finishNode(J, "ThrowStatement")
		};
		var PQ = [];
		G.parseCatchClauseParam = function() {
			var J = this.parseBindingAtom(),
				Q = J.type === "Identifier";
			return this.enterScope(Q ? hJ : 0), this.checkLValPattern(J, Q ? lJ : m), this.expect(W.parenR), J
		}, G.parseTryStatement = function(J) {
			if (this.next(), J.block = this.parseBlock(), J.handler = null, this.type === W._catch) {
				var Q = this.startNode();
				if (this.next(), this.eat(W.parenL)) Q.param = this.parseCatchClauseParam();
				else {
					if (this.options.ecmaVersion < 10) this.unexpected();
					Q.param = null, this.enterScope(0)
				}
				Q.body = this.parseBlock(!1), this.exitScope(), J.handler = this.finishNode(Q, "CatchClause")
			}
			if (J.finalizer = this.eat(W._finally) ? this.parseBlock() : null, !J.handler && !J.finalizer) this
				.raise(J.start, "Missing catch or finally clause");
			return this.finishNode(J, "TryStatement")
		}, G.parseVarStatement = function(J, Q, Z) {
			return this.next(), this.parseVar(J, !1, Q, Z), this.semicolon(), this.finishNode(J,
				"VariableDeclaration")
		}, G.parseWhileStatement = function(J) {
			return this.next(), J.test = this.parseParenExpression(), this.labels.push(CJ), J.body = this
				.parseStatement("while"), this.labels.pop(), this.finishNode(J, "WhileStatement")
		}, G.parseWithStatement = function(J) {
			if (this.strict) this.raise(this.start, "'with' in strict mode");
			return this.next(), J.object = this.parseParenExpression(), J.body = this.parseStatement("with"),
				this.finishNode(J, "WithStatement")
		}, G.parseEmptyStatement = function(J) {
			return this.next(), this.finishNode(J, "EmptyStatement")
		}, G.parseLabeledStatement = function(J, Q, Z, q) {
			for (var X = 0, Y = this.labels; X < Y.length; X += 1) {
				var j = Y[X];
				if (j.name === Q) this.raise(Z.start, "Label '" + Q + "' is already declared")
			}
			var H = this.type.isLoop ? "loop" : this.type === W._switch ? "switch" : null;
			for (var K = this.labels.length - 1; K >= 0; K--) {
				var R = this.labels[K];
				if (R.statementStart === J.start) R.statementStart = this.start, R.kind = H;
				else break
			}
			return this.labels.push({
					name: Q,
					kind: H,
					statementStart: this.start
				}), J.body = this.parseStatement(q ? q.indexOf("label") === -1 ? q + "label" : q : "label"),
				this.labels.pop(), J.label = Z, this.finishNode(J, "LabeledStatement")
		}, G.parseExpressionStatement = function(J, Q) {
			return J.expression = Q, this.semicolon(), this.finishNode(J, "ExpressionStatement")
		}, G.parseBlock = function(J, Q, Z) {
			if (J === void 0) J = !0;
			if (Q === void 0) Q = this.startNode();
			if (Q.body = [], this.expect(W.braceL), J) this.enterScope(0);
			while (this.type !== W.braceR) {
				var q = this.parseStatement(null);
				Q.body.push(q)
			}
			if (Z) this.strict = !1;
			if (this.next(), J) this.exitScope();
			return this.finishNode(Q, "BlockStatement")
		}, G.parseFor = function(J, Q) {
			return J.init = Q, this.expect(W.semi), J.test = this.type === W.semi ? null : this
				.parseExpression(), this.expect(W.semi), J.update = this.type === W.parenR ? null : this
				.parseExpression(), this.expect(W.parenR), J.body = this.parseStatement("for"), this
			.exitScope(), this.labels.pop(), this.finishNode(J, "ForStatement")
		}, G.parseForIn = function(J, Q) {
			var Z = this.type === W._in;
			if (this.next(), Q.type === "VariableDeclaration" && Q.declarations[0].init != null && (!Z || this
					.options.ecmaVersion < 8 || this.strict || Q.kind !== "var" || Q.declarations[0].id.type !==
					"Identifier")) this.raise(Q.start, (Z ? "for-in" : "for-of") +
				" loop variable declaration may not have an initializer");
			return J.left = Q, J.right = Z ? this.parseExpression() : this.parseMaybeAssign(), this.expect(W
					.parenR), J.body = this.parseStatement("for"), this.exitScope(), this.labels.pop(), this
				.finishNode(J, Z ? "ForInStatement" : "ForOfStatement")
		}, G.parseVar = function(J, Q, Z, q) {
			J.declarations = [], J.kind = Z;
			for (;;) {
				var X = this.startNode();
				if (this.parseVarId(X, Z), this.eat(W.eq)) X.init = this.parseMaybeAssign(Q);
				else if (!q && Z === "const" && !(this.type === W._in || this.options.ecmaVersion >= 6 && this
						.isContextual("of"))) this.unexpected();
				else if (!q && (Z === "using" || Z === "await using") && this.options.ecmaVersion >= 17 && this
					.type !== W._in && !this.isContextual("of")) this.raise(this.lastTokEnd,
					"Missing initializer in " + Z + " declaration");
				else if (!q && X.id.type !== "Identifier" && !(Q && (this.type === W._in || this.isContextual(
						"of")))) this.raise(this.lastTokEnd,
					"Complex binding patterns require an initialization value");
				else X.init = null;
				if (J.declarations.push(this.finishNode(X, "VariableDeclarator")), !this.eat(W.comma)) break
			}
			return J
		}, G.parseVarId = function(J, Q) {
			J.id = Q === "using" || Q === "await using" ? this.parseIdent() : this.parseBindingAtom(), this
				.checkLValPattern(J.id, Q === "var" ? AJ : m, !1)
		};
		var JJ = 1,
			wJ = 2,
			cJ = 4;
		G.parseFunction = function(J, Q, Z, q, X) {
			if (this.initFunction(J), this.options.ecmaVersion >= 9 || this.options.ecmaVersion >= 6 && !q) {
				if (this.type === W.star && Q & wJ) this.unexpected();
				J.generator = this.eat(W.star)
			}
			if (this.options.ecmaVersion >= 8) J.async = !!q;
			if (Q & JJ) {
				if (J.id = Q & cJ && this.type !== W.name ? null : this.parseIdent(), J.id && !(Q & wJ)) this
					.checkLValSimple(J.id, this.strict || J.generator || J.async ? this.treatFunctionsAsVar ?
						AJ : m : uJ)
			}
			var Y = this.yieldPos,
				j = this.awaitPos,
				H = this.awaitIdentPos;
			if (this.yieldPos = 0, this.awaitPos = 0, this.awaitIdentPos = 0, this.enterScope(bJ(J.async, J
					.generator)), !(Q & JJ)) J.id = this.type === W.name ? this.parseIdent() : null;
			return this.parseFunctionParams(J), this.parseFunctionBody(J, Z, !1, X), this.yieldPos = Y, this
				.awaitPos = j, this.awaitIdentPos = H, this.finishNode(J, Q & JJ ? "FunctionDeclaration" :
					"FunctionExpression")
		}, G.parseFunctionParams = function(J) {
			this.expect(W.parenL), J.params = this.parseBindingList(W.parenR, !1, this.options.ecmaVersion >=
				8), this.checkYieldAwaitInDefaultParams()
		}, G.parseClass = function(J, Q) {
			this.next();
			var Z = this.strict;
			this.strict = !0, this.parseClassId(J, Q), this.parseClassSuper(J);
			var q = this.enterClassBody(),
				X = this.startNode(),
				Y = !1;
			X.body = [], this.expect(W.braceL);
			while (this.type !== W.braceR) {
				var j = this.parseClassElement(J.superClass !== null);
				if (j) {
					if (X.body.push(j), j.type === "MethodDefinition" && j.kind === "constructor") {
						if (Y) this.raiseRecoverable(j.start, "Duplicate constructor in the same class");
						Y = !0
					} else if (j.key && j.key.type === "PrivateIdentifier" && kQ(q, j)) this.raiseRecoverable(j
						.key.start, "Identifier '#" + j.key.name + "' has already been declared")
				}
			}
			return this.strict = Z, this.next(), J.body = this.finishNode(X, "ClassBody"), this.exitClassBody(),
				this.finishNode(J, Q ? "ClassDeclaration" : "ClassExpression")
		}, G.parseClassElement = function(J) {
			if (this.eat(W.semi)) return null;
			var Q = this.options.ecmaVersion,
				Z = this.startNode(),
				q = "",
				X = !1,
				Y = !1,
				j = "method",
				H = !1;
			if (this.eatContextual("static")) {
				if (Q >= 13 && this.eat(W.braceL)) return this.parseClassStaticBlock(Z), Z;
				if (this.isClassElementNameStart() || this.type === W.star) H = !0;
				else q = "static"
			}
			if (Z.static = H, !q && Q >= 8 && this.eatContextual("async"))
				if ((this.isClassElementNameStart() || this.type === W.star) && !this.canInsertSemicolon())
					Y = !0;
				else q = "async";
			if (!q && (Q >= 9 || !Y) && this.eat(W.star)) X = !0;
			if (!q && !Y && !X) {
				var K = this.value;
				if (this.eatContextual("get") || this.eatContextual("set"))
					if (this.isClassElementNameStart()) j = K;
					else q = K
			}
			if (q) Z.computed = !1, Z.key = this.startNodeAt(this.lastTokStart, this.lastTokStartLoc), Z.key
				.name = q, this.finishNode(Z.key, "Identifier");
			else this.parseClassElementName(Z);
			if (Q < 13 || this.type === W.parenL || j !== "method" || X || Y) {
				var R = !Z.static && zJ(Z, "constructor"),
					M = R && J;
				if (R && j !== "method") this.raise(Z.key.start, "Constructor can't have get/set modifier");
				Z.kind = R ? "constructor" : j, this.parseClassMethod(Z, X, Y, M)
			} else this.parseClassField(Z);
			return Z
		}, G.isClassElementNameStart = function() {
			return this.type === W.name || this.type === W.privateId || this.type === W.num || this.type === W
				.string || this.type === W.bracketL || this.type.keyword
		}, G.parseClassElementName = function(J) {
			if (this.type === W.privateId) {
				if (this.value === "constructor") this.raise(this.start,
					"Classes can't have an element named '#constructor'");
				J.computed = !1, J.key = this.parsePrivateIdent()
			} else this.parsePropertyName(J)
		}, G.parseClassMethod = function(J, Q, Z, q) {
			var X = J.key;
			if (J.kind === "constructor") {
				if (Q) this.raise(X.start, "Constructor can't be a generator");
				if (Z) this.raise(X.start, "Constructor can't be an async method")
			} else if (J.static && zJ(J, "prototype")) this.raise(X.start,
				"Classes may not have a static property named prototype");
			var Y = J.value = this.parseMethod(Q, Z, q);
			if (J.kind === "get" && Y.params.length !== 0) this.raiseRecoverable(Y.start,
				"getter should have no params");
			if (J.kind === "set" && Y.params.length !== 1) this.raiseRecoverable(Y.start,
				"setter should have exactly one param");
			if (J.kind === "set" && Y.params[0].type === "RestElement") this.raiseRecoverable(Y.params[0].start,
				"Setter cannot use rest params");
			return this.finishNode(J, "MethodDefinition")
		}, G.parseClassField = function(J) {
			if (zJ(J, "constructor")) this.raise(J.key.start, "Classes can't have a field named 'constructor'");
			else if (J.static && zJ(J, "prototype")) this.raise(J.key.start,
				"Classes can't have a static field named 'prototype'");
			if (this.eat(W.eq)) this.enterScope(e | YJ), J.value = this.parseMaybeAssign(), this.exitScope();
			else J.value = null;
			return this.semicolon(), this.finishNode(J, "PropertyDefinition")
		}, G.parseClassStaticBlock = function(J) {
			J.body = [];
			var Q = this.labels;
			this.labels = [], this.enterScope(p | YJ);
			while (this.type !== W.braceR) {
				var Z = this.parseStatement(null);
				J.body.push(Z)
			}
			return this.next(), this.exitScope(), this.labels = Q, this.finishNode(J, "StaticBlock")
		}, G.parseClassId = function(J, Q) {
			if (this.type === W.name) {
				if (J.id = this.parseIdent(), Q) this.checkLValSimple(J.id, m, !1)
			} else {
				if (Q === !0) this.unexpected();
				J.id = null
			}
		}, G.parseClassSuper = function(J) {
			J.superClass = this.eat(W._extends) ? this.parseExprSubscripts(null, !1) : null
		}, G.enterClassBody = function() {
			var J = {
				declared: Object.create(null),
				used: []
			};
			return this.privateNameStack.push(J), J.declared
		}, G.exitClassBody = function() {
			var J = this.privateNameStack.pop(),
				Q = J.declared,
				Z = J.used;
			if (!this.options.checkPrivateFields) return;
			var q = this.privateNameStack.length,
				X = q === 0 ? null : this.privateNameStack[q - 1];
			for (var Y = 0; Y < Z.length; ++Y) {
				var j = Z[Y];
				if (!c(Q, j.name))
					if (X) X.used.push(j);
					else this.raiseRecoverable(j.start, "Private field '#" + j.name +
						"' must be declared in an enclosing class")
			}
		};

		function kQ(J, Q) {
			var Z = Q.key.name,
				q = J[Z],
				X = "true";
			if (Q.type === "MethodDefinition" && (Q.kind === "get" || Q.kind === "set")) X = (Q.static ? "s" :
				"i") + Q.kind;
			if (q === "iget" && X === "iset" || q === "iset" && X === "iget" || q === "sget" && X === "sset" ||
				q === "sset" && X === "sget") return J[Z] = "true", !1;
			else if (!q) return J[Z] = X, !1;
			else return !0
		}

		function zJ(J, Q) {
			var {
				computed: Z,
				key: q
			} = J;
			return !Z && (q.type === "Identifier" && q.name === Q || q.type === "Literal" && q.value === Q)
		}
		G.parseExportAllDeclaration = function(J, Q) {
			if (this.options.ecmaVersion >= 11)
				if (this.eatContextual("as")) J.exported = this.parseModuleExportName(), this.checkExport(Q, J
					.exported, this.lastTokStart);
				else J.exported = null;
			if (this.expectContextual("from"), this.type !== W.string) this.unexpected();
			if (J.source = this.parseExprAtom(), this.options.ecmaVersion >= 16) J.attributes = this
				.parseWithClause();
			return this.semicolon(), this.finishNode(J, "ExportAllDeclaration")
		}, G.parseExport = function(J, Q) {
			if (this.next(), this.eat(W.star)) return this.parseExportAllDeclaration(J, Q);
			if (this.eat(W._default)) return this.checkExport(Q, "default", this.lastTokStart), J.declaration =
				this.parseExportDefaultDeclaration(), this.finishNode(J, "ExportDefaultDeclaration");
			if (this.shouldParseExportStatement()) {
				if (J.declaration = this.parseExportDeclaration(J), J.declaration.type ===
					"VariableDeclaration") this.checkVariableExport(Q, J.declaration.declarations);
				else this.checkExport(Q, J.declaration.id, J.declaration.id.start);
				if (J.specifiers = [], J.source = null, this.options.ecmaVersion >= 16) J.attributes = []
			} else {
				if (J.declaration = null, J.specifiers = this.parseExportSpecifiers(Q), this.eatContextual(
						"from")) {
					if (this.type !== W.string) this.unexpected();
					if (J.source = this.parseExprAtom(), this.options.ecmaVersion >= 16) J.attributes = this
						.parseWithClause()
				} else {
					for (var Z = 0, q = J.specifiers; Z < q.length; Z += 1) {
						var X = q[Z];
						if (this.checkUnreserved(X.local), this.checkLocalExport(X.local), X.local.type ===
							"Literal") this.raise(X.local.start,
							"A string literal cannot be used as an exported binding without `from`.")
					}
					if (J.source = null, this.options.ecmaVersion >= 16) J.attributes = []
				}
				this.semicolon()
			}
			return this.finishNode(J, "ExportNamedDeclaration")
		}, G.parseExportDeclaration = function(J) {
			return this.parseStatement(null)
		}, G.parseExportDefaultDeclaration = function() {
			var J;
			if (this.type === W._function || (J = this.isAsyncFunction())) {
				var Q = this.startNode();
				if (this.next(), J) this.next();
				return this.parseFunction(Q, JJ | cJ, !1, J)
			} else if (this.type === W._class) {
				var Z = this.startNode();
				return this.parseClass(Z, "nullableID")
			} else {
				var q = this.parseMaybeAssign();
				return this.semicolon(), q
			}
		}, G.checkExport = function(J, Q, Z) {
			if (!J) return;
			if (typeof Q !== "string") Q = Q.type === "Identifier" ? Q.name : Q.value;
			if (c(J, Q)) this.raiseRecoverable(Z, "Duplicate export '" + Q + "'");
			J[Q] = !0
		}, G.checkPatternExport = function(J, Q) {
			var Z = Q.type;
			if (Z === "Identifier") this.checkExport(J, Q, Q.start);
			else if (Z === "ObjectPattern")
				for (var q = 0, X = Q.properties; q < X.length; q += 1) {
					var Y = X[q];
					this.checkPatternExport(J, Y)
				} else if (Z === "ArrayPattern")
					for (var j = 0, H = Q.elements; j < H.length; j += 1) {
						var K = H[j];
						if (K) this.checkPatternExport(J, K)
					} else if (Z === "Property") this.checkPatternExport(J, Q.value);
					else if (Z === "AssignmentPattern") this.checkPatternExport(J, Q.left);
			else if (Z === "RestElement") this.checkPatternExport(J, Q.argument)
		}, G.checkVariableExport = function(J, Q) {
			if (!J) return;
			for (var Z = 0, q = Q; Z < q.length; Z += 1) {
				var X = q[Z];
				this.checkPatternExport(J, X.id)
			}
		}, G.shouldParseExportStatement = function() {
			return this.type.keyword === "var" || this.type.keyword === "const" || this.type.keyword ===
				"class" || this.type.keyword === "function" || this.isLet() || this.isAsyncFunction()
		}, G.parseExportSpecifier = function(J) {
			var Q = this.startNode();
			return Q.local = this.parseModuleExportName(), Q.exported = this.eatContextual("as") ? this
				.parseModuleExportName() : Q.local, this.checkExport(J, Q.exported, Q.exported.start), this
				.finishNode(Q, "ExportSpecifier")
		}, G.parseExportSpecifiers = function(J) {
			var Q = [],
				Z = !0;
			this.expect(W.braceL);
			while (!this.eat(W.braceR)) {
				if (!Z) {
					if (this.expect(W.comma), this.afterTrailingComma(W.braceR)) break
				} else Z = !1;
				Q.push(this.parseExportSpecifier(J))
			}
			return Q
		}, G.parseImport = function(J) {
			if (this.next(), this.type === W.string) J.specifiers = PQ, J.source = this.parseExprAtom();
			else J.specifiers = this.parseImportSpecifiers(), this.expectContextual("from"), J.source = this
				.type === W.string ? this.parseExprAtom() : this.unexpected();
			if (this.options.ecmaVersion >= 16) J.attributes = this.parseWithClause();
			return this.semicolon(), this.finishNode(J, "ImportDeclaration")
		}, G.parseImportSpecifier = function() {
			var J = this.startNode();
			if (J.imported = this.parseModuleExportName(), this.eatContextual("as")) J.local = this
		.parseIdent();
			else this.checkUnreserved(J.imported), J.local = J.imported;
			return this.checkLValSimple(J.local, m), this.finishNode(J, "ImportSpecifier")
		}, G.parseImportDefaultSpecifier = function() {
			var J = this.startNode();
			return J.local = this.parseIdent(), this.checkLValSimple(J.local, m), this.finishNode(J,
				"ImportDefaultSpecifier")
		}, G.parseImportNamespaceSpecifier = function() {
			var J = this.startNode();
			return this.next(), this.expectContextual("as"), J.local = this.parseIdent(), this.checkLValSimple(J
				.local, m), this.finishNode(J, "ImportNamespaceSpecifier")
		}, G.parseImportSpecifiers = function() {
			var J = [],
				Q = !0;
			if (this.type === W.name) {
				if (J.push(this.parseImportDefaultSpecifier()), !this.eat(W.comma)) return J
			}
			if (this.type === W.star) return J.push(this.parseImportNamespaceSpecifier()), J;
			this.expect(W.braceL);
			while (!this.eat(W.braceR)) {
				if (!Q) {
					if (this.expect(W.comma), this.afterTrailingComma(W.braceR)) break
				} else Q = !1;
				J.push(this.parseImportSpecifier())
			}
			return J
		}, G.parseWithClause = function() {
			var J = [];
			if (!this.eat(W._with)) return J;
			this.expect(W.braceL);
			var Q = {},
				Z = !0;
			while (!this.eat(W.braceR)) {
				if (!Z) {
					if (this.expect(W.comma), this.afterTrailingComma(W.braceR)) break
				} else Z = !1;
				var q = this.parseImportAttribute(),
					X = q.key.type === "Identifier" ? q.key.name : q.key.value;
				if (c(Q, X)) this.raiseRecoverable(q.key.start, "Duplicate attribute key '" + X + "'");
				Q[X] = !0, J.push(q)
			}
			return J
		}, G.parseImportAttribute = function() {
			var J = this.startNode();
			if (J.key = this.type === W.string ? this.parseExprAtom() : this.parseIdent(this.options
					.allowReserved !== "never"), this.expect(W.colon), this.type !== W.string) this
		.unexpected();
			return J.value = this.parseExprAtom(), this.finishNode(J, "ImportAttribute")
		}, G.parseModuleExportName = function() {
			if (this.options.ecmaVersion >= 13 && this.type === W.string) {
				var J = this.parseLiteral(this.value);
				if (AQ.test(J.value)) this.raise(J.start, "An export name cannot include a lone surrogate.");
				return J
			}
			return this.parseIdent(!0)
		}, G.adaptDirectivePrologue = function(J) {
			for (var Q = 0; Q < J.length && this.isDirectiveCandidate(J[Q]); ++Q) J[Q].directive = J[Q]
				.expression.raw.slice(1, -1)
		}, G.isDirectiveCandidate = function(J) {
			return this.options.ecmaVersion >= 5 && J.type === "ExpressionStatement" && J.expression.type ===
				"Literal" && typeof J.expression.value === "string" && (this.input[J.start] === '"' || this
					.input[J.start] === "'")
		};
		var L = $.prototype;
		L.toAssignable = function(J, Q, Z) {
			if (this.options.ecmaVersion >= 6 && J) switch (J.type) {
				case "Identifier":
					if (this.inAsync && J.name === "await") this.raise(J.start,
						"Cannot use 'await' as identifier inside an async function");
					break;
				case "ObjectPattern":
				case "ArrayPattern":
				case "AssignmentPattern":
				case "RestElement":
					break;
				case "ObjectExpression":
					if (J.type = "ObjectPattern", Z) this.checkPatternErrors(Z, !0);
					for (var q = 0, X = J.properties; q < X.length; q += 1) {
						var Y = X[q];
						if (this.toAssignable(Y, Q), Y.type === "RestElement" && (Y.argument.type ===
								"ArrayPattern" || Y.argument.type === "ObjectPattern")) this.raise(Y
							.argument.start, "Unexpected token")
					}
					break;
				case "Property":
					if (J.kind !== "init") this.raise(J.key.start,
						"Object pattern can't contain getter or setter");
					this.toAssignable(J.value, Q);
					break;
				case "ArrayExpression":
					if (J.type = "ArrayPattern", Z) this.checkPatternErrors(Z, !0);
					this.toAssignableList(J.elements, Q);
					break;
				case "SpreadElement":
					if (J.type = "RestElement", this.toAssignable(J.argument, Q), J.argument.type ===
						"AssignmentPattern") this.raise(J.argument.start,
						"Rest elements cannot have a default value");
					break;
				case "AssignmentExpression":
					if (J.operator !== "=") this.raise(J.left.end,
						"Only '=' operator can be used for specifying default value.");
					J.type = "AssignmentPattern", delete J.operator, this.toAssignable(J.left, Q);
					break;
				case "ParenthesizedExpression":
					this.toAssignable(J.expression, Q, Z);
					break;
				case "ChainExpression":
					this.raiseRecoverable(J.start, "Optional chaining cannot appear in left-hand side");
					break;
				case "MemberExpression":
					if (!Q) break;
				default:
					this.raise(J.start, "Assigning to rvalue")
			} else if (Z) this.checkPatternErrors(Z, !0);
			return J
		}, L.toAssignableList = function(J, Q) {
			var Z = J.length;
			for (var q = 0; q < Z; q++) {
				var X = J[q];
				if (X) this.toAssignable(X, Q)
			}
			if (Z) {
				var Y = J[Z - 1];
				if (this.options.ecmaVersion === 6 && Q && Y && Y.type === "RestElement" && Y.argument.type !==
					"Identifier") this.unexpected(Y.argument.start)
			}
			return J
		}, L.parseSpread = function(J) {
			var Q = this.startNode();
			return this.next(), Q.argument = this.parseMaybeAssign(!1, J), this.finishNode(Q, "SpreadElement")
		}, L.parseRestBinding = function() {
			var J = this.startNode();
			if (this.next(), this.options.ecmaVersion === 6 && this.type !== W.name) this.unexpected();
			return J.argument = this.parseBindingAtom(), this.finishNode(J, "RestElement")
		}, L.parseBindingAtom = function() {
			if (this.options.ecmaVersion >= 6) switch (this.type) {
				case W.bracketL:
					var J = this.startNode();
					return this.next(), J.elements = this.parseBindingList(W.bracketR, !0, !0), this
						.finishNode(J, "ArrayPattern");
				case W.braceL:
					return this.parseObj(!0)
			}
			return this.parseIdent()
		}, L.parseBindingList = function(J, Q, Z, q) {
			var X = [],
				Y = !0;
			while (!this.eat(J)) {
				if (Y) Y = !1;
				else this.expect(W.comma);
				if (Q && this.type === W.comma) X.push(null);
				else if (Z && this.afterTrailingComma(J)) break;
				else if (this.type === W.ellipsis) {
					var j = this.parseRestBinding();
					if (this.parseBindingListItem(j), X.push(j), this.type === W.comma) this.raiseRecoverable(
						this.start, "Comma is not permitted after the rest element");
					this.expect(J);
					break
				} else X.push(this.parseAssignableListItem(q))
			}
			return X
		}, L.parseAssignableListItem = function(J) {
			var Q = this.parseMaybeDefault(this.start, this.startLoc);
			return this.parseBindingListItem(Q), Q
		}, L.parseBindingListItem = function(J) {
			return J
		}, L.parseMaybeDefault = function(J, Q, Z) {
			if (Z = Z || this.parseBindingAtom(), this.options.ecmaVersion < 6 || !this.eat(W.eq)) return Z;
			var q = this.startNodeAt(J, Q);
			return q.left = Z, q.right = this.parseMaybeAssign(), this.finishNode(q, "AssignmentPattern")
		}, L.checkLValSimple = function(J, Q, Z) {
			if (Q === void 0) Q = HJ;
			var q = Q !== HJ;
			switch (J.type) {
				case "Identifier":
					if (this.strict && this.reservedWordsStrictBind.test(J.name)) this.raiseRecoverable(J.start,
						(q ? "Binding " : "Assigning to ") + J.name + " in strict mode");
					if (q) {
						if (Q === m && J.name === "let") this.raiseRecoverable(J.start,
							"let is disallowed as a lexically bound name");
						if (Z) {
							if (c(Z, J.name)) this.raiseRecoverable(J.start, "Argument name clash");
							Z[J.name] = !0
						}
						if (Q !== pJ) this.declareName(J.name, Q, J.start)
					}
					break;
				case "ChainExpression":
					this.raiseRecoverable(J.start, "Optional chaining cannot appear in left-hand side");
					break;
				case "MemberExpression":
					if (q) this.raiseRecoverable(J.start, "Binding member expression");
					break;
				case "ParenthesizedExpression":
					if (q) this.raiseRecoverable(J.start, "Binding parenthesized expression");
					return this.checkLValSimple(J.expression, Q, Z);
				default:
					this.raise(J.start, (q ? "Binding" : "Assigning to") + " rvalue")
			}
		}, L.checkLValPattern = function(J, Q, Z) {
			if (Q === void 0) Q = HJ;
			switch (J.type) {
				case "ObjectPattern":
					for (var q = 0, X = J.properties; q < X.length; q += 1) {
						var Y = X[q];
						this.checkLValInnerPattern(Y, Q, Z)
					}
					break;
				case "ArrayPattern":
					for (var j = 0, H = J.elements; j < H.length; j += 1) {
						var K = H[j];
						if (K) this.checkLValInnerPattern(K, Q, Z)
					}
					break;
				default:
					this.checkLValSimple(J, Q, Z)
			}
		}, L.checkLValInnerPattern = function(J, Q, Z) {
			if (Q === void 0) Q = HJ;
			switch (J.type) {
				case "Property":
					this.checkLValInnerPattern(J.value, Q, Z);
					break;
				case "AssignmentPattern":
					this.checkLValPattern(J.left, Q, Z);
					break;
				case "RestElement":
					this.checkLValPattern(J.argument, Q, Z);
					break;
				default:
					this.checkLValPattern(J, Q, Z)
			}
		};
		var P = function J(Q, Z, q, X, Y) {
				this.token = Q, this.isExpr = !!Z, this.preserveSpace = !!q, this.override = X, this.generator = !!Y
			},
			U = {
				b_stat: new P("{", !1),
				b_expr: new P("{", !0),
				b_tmpl: new P("${", !1),
				p_stat: new P("(", !1),
				p_expr: new P("(", !0),
				q_tmpl: new P("`", !0, !0, function(J) {
					return J.tryReadTemplateToken()
				}),
				f_stat: new P("function", !1),
				f_expr: new P("function", !0),
				f_expr_gen: new P("function", !0, !1, null, !0),
				f_gen: new P("function", !1, !1, null, !0)
			},
			n = $.prototype;
		n.initialContext = function() {
				return [U.b_stat]
			}, n.curContext = function() {
				return this.context[this.context.length - 1]
			}, n.braceIsBlock = function(J) {
				var Q = this.curContext();
				if (Q === U.f_expr || Q === U.f_stat) return !0;
				if (J === W.colon && (Q === U.b_stat || Q === U.b_expr)) return !Q.isExpr;
				if (J === W._return || J === W.name && this.exprAllowed) return b.test(this.input.slice(this
					.lastTokEnd, this.start));
				if (J === W._else || J === W.semi || J === W.eof || J === W.parenR || J === W.arrow) return !0;
				if (J === W.braceL) return Q === U.b_stat;
				if (J === W._var || J === W._const || J === W.name) return !1;
				return !this.exprAllowed
			}, n.inGeneratorContext = function() {
				for (var J = this.context.length - 1; J >= 1; J--) {
					var Q = this.context[J];
					if (Q.token === "function") return Q.generator
				}
				return !1
			}, n.updateContext = function(J) {
				var Q, Z = this.type;
				if (Z.keyword && J === W.dot) this.exprAllowed = !1;
				else if (Q = Z.updateContext) Q.call(this, J);
				else this.exprAllowed = Z.beforeExpr
			}, n.overrideContext = function(J) {
				if (this.curContext() !== J) this.context[this.context.length - 1] = J
			}, W.parenR.updateContext = W.braceR.updateContext = function() {
				if (this.context.length === 1) {
					this.exprAllowed = !0;
					return
				}
				var J = this.context.pop();
				if (J === U.b_stat && this.curContext().token === "function") J = this.context.pop();
				this.exprAllowed = !J.isExpr
			}, W.braceL.updateContext = function(J) {
				this.context.push(this.braceIsBlock(J) ? U.b_stat : U.b_expr), this.exprAllowed = !0
			}, W.dollarBraceL.updateContext = function() {
				this.context.push(U.b_tmpl), this.exprAllowed = !0
			}, W.parenL.updateContext = function(J) {
				var Q = J === W._if || J === W._for || J === W._with || J === W._while;
				this.context.push(Q ? U.p_stat : U.p_expr), this.exprAllowed = !0
			}, W.incDec.updateContext = function() {}, W._function.updateContext = W._class.updateContext =
			function(J) {
				if (J.beforeExpr && J !== W._else && !(J === W.semi && this.curContext() !== U.p_stat) && !(J === W
						._return && b.test(this.input.slice(this.lastTokEnd, this.start))) && !((J === W.colon ||
						J === W.braceL) && this.curContext() === U.b_stat)) this.context.push(U.f_expr);
				else this.context.push(U.f_stat);
				this.exprAllowed = !1
			}, W.colon.updateContext = function() {
				if (this.curContext().token === "function") this.context.pop();
				this.exprAllowed = !0
			}, W.backQuote.updateContext = function() {
				if (this.curContext() === U.q_tmpl) this.context.pop();
				else this.context.push(U.q_tmpl);
				this.exprAllowed = !1
			}, W.star.updateContext = function(J) {
				if (J === W._function) {
					var Q = this.context.length - 1;
					if (this.context[Q] === U.f_expr) this.context[Q] = U.f_expr_gen;
					else this.context[Q] = U.f_gen
				}
				this.exprAllowed = !0
			}, W.name.updateContext = function(J) {
				var Q = !1;
				if (this.options.ecmaVersion >= 6 && J !== W.dot) {
					if (this.value === "of" && !this.exprAllowed || this.value === "yield" && this
						.inGeneratorContext()) Q = !0
				}
				this.exprAllowed = Q
			};
		var F = $.prototype;
		F.checkPropClash = function(J, Q, Z) {
			if (this.options.ecmaVersion >= 9 && J.type === "SpreadElement") return;
			if (this.options.ecmaVersion >= 6 && (J.computed || J.method || J.shorthand)) return;
			var q = J.key,
				X;
			switch (q.type) {
				case "Identifier":
					X = q.name;
					break;
				case "Literal":
					X = String(q.value);
					break;
				default:
					return
			}
			var Y = J.kind;
			if (this.options.ecmaVersion >= 6) {
				if (X === "__proto__" && Y === "init") {
					if (Q.proto)
						if (Z) {
							if (Z.doubleProto < 0) Z.doubleProto = q.start
						} else this.raiseRecoverable(q.start, "Redefinition of __proto__ property");
					Q.proto = !0
				}
				return
			}
			X = "$" + X;
			var j = Q[X];
			if (j) {
				var H;
				if (Y === "init") H = this.strict && j.init || j.get || j.set;
				else H = j.init || j[Y];
				if (H) this.raiseRecoverable(q.start, "Redefinition of property")
			} else j = Q[X] = {
				init: !1,
				get: !1,
				set: !1
			};
			j[Y] = !0
		}, F.parseExpression = function(J, Q) {
			var Z = this.start,
				q = this.startLoc,
				X = this.parseMaybeAssign(J, Q);
			if (this.type === W.comma) {
				var Y = this.startNodeAt(Z, q);
				Y.expressions = [X];
				while (this.eat(W.comma)) Y.expressions.push(this.parseMaybeAssign(J, Q));
				return this.finishNode(Y, "SequenceExpression")
			}
			return X
		}, F.parseMaybeAssign = function(J, Q, Z) {
			if (this.isContextual("yield"))
				if (this.inGenerator) return this.parseYield(J);
				else this.exprAllowed = !1;
			var q = !1,
				X = -1,
				Y = -1,
				j = -1;
			if (Q) X = Q.parenthesizedAssign, Y = Q.trailingComma, j = Q.doubleProto, Q.parenthesizedAssign = Q
				.trailingComma = -1;
			else Q = new KJ, q = !0;
			var H = this.start,
				K = this.startLoc;
			if (this.type === W.parenL || this.type === W.name) this.potentialArrowAt = this.start, this
				.potentialArrowInForAwait = J === "await";
			var R = this.parseMaybeConditional(J, Q);
			if (Z) R = Z.call(this, R, H, K);
			if (this.type.isAssign) {
				var M = this.startNodeAt(H, K);
				if (M.operator = this.value, this.type === W.eq) R = this.toAssignable(R, !1, Q);
				if (!q) Q.parenthesizedAssign = Q.trailingComma = Q.doubleProto = -1;
				if (Q.shorthandAssign >= R.start) Q.shorthandAssign = -1;
				if (this.type === W.eq) this.checkLValPattern(R);
				else this.checkLValSimple(R);
				if (M.left = R, this.next(), M.right = this.parseMaybeAssign(J), j > -1) Q.doubleProto = j;
				return this.finishNode(M, "AssignmentExpression")
			} else if (q) this.checkExpressionErrors(Q, !0);
			if (X > -1) Q.parenthesizedAssign = X;
			if (Y > -1) Q.trailingComma = Y;
			return R
		}, F.parseMaybeConditional = function(J, Q) {
			var Z = this.start,
				q = this.startLoc,
				X = this.parseExprOps(J, Q);
			if (this.checkExpressionErrors(Q)) return X;
			if (this.eat(W.question)) {
				var Y = this.startNodeAt(Z, q);
				return Y.test = X, Y.consequent = this.parseMaybeAssign(), this.expect(W.colon), Y.alternate =
					this.parseMaybeAssign(J), this.finishNode(Y, "ConditionalExpression")
			}
			return X
		}, F.parseExprOps = function(J, Q) {
			var Z = this.start,
				q = this.startLoc,
				X = this.parseMaybeUnary(Q, !1, !1, J);
			if (this.checkExpressionErrors(Q)) return X;
			return X.start === Z && X.type === "ArrowFunctionExpression" ? X : this.parseExprOp(X, Z, q, -1, J)
		}, F.parseExprOp = function(J, Q, Z, q, X) {
			var Y = this.type.binop;
			if (Y != null && (!X || this.type !== W._in)) {
				if (Y > q) {
					var j = this.type === W.logicalOR || this.type === W.logicalAND,
						H = this.type === W.coalesce;
					if (H) Y = W.logicalAND.binop;
					var K = this.value;
					this.next();
					var R = this.start,
						M = this.startLoc,
						N = this.parseExprOp(this.parseMaybeUnary(null, !1, !1, X), R, M, Y, X),
						v = this.buildBinary(Q, Z, J, N, K, j || H);
					if (j && this.type === W.coalesce || H && (this.type === W.logicalOR || this.type === W
							.logicalAND)) this.raiseRecoverable(this.start,
						"Logical expressions and coalesce expressions cannot be mixed. Wrap either by parentheses"
						);
					return this.parseExprOp(v, Q, Z, q, X)
				}
			}
			return J
		}, F.buildBinary = function(J, Q, Z, q, X, Y) {
			if (q.type === "PrivateIdentifier") this.raise(q.start,
				"Private identifier can only be left side of binary expression");
			var j = this.startNodeAt(J, Q);
			return j.left = Z, j.operator = X, j.right = q, this.finishNode(j, Y ? "LogicalExpression" :
				"BinaryExpression")
		}, F.parseMaybeUnary = function(J, Q, Z, q) {
			var X = this.start,
				Y = this.startLoc,
				j;
			if (this.isContextual("await") && this.canAwait) j = this.parseAwait(q), Q = !0;
			else if (this.type.prefix) {
				var H = this.startNode(),
					K = this.type === W.incDec;
				if (H.operator = this.value, H.prefix = !0, this.next(), H.argument = this.parseMaybeUnary(null,
						!0, K, q), this.checkExpressionErrors(J, !0), K) this.checkLValSimple(H.argument);
				else if (this.strict && H.operator === "delete" && dJ(H.argument)) this.raiseRecoverable(H
					.start, "Deleting local variable in strict mode");
				else if (H.operator === "delete" && SJ(H.argument)) this.raiseRecoverable(H.start,
					"Private fields can not be deleted");
				else Q = !0;
				j = this.finishNode(H, K ? "UpdateExpression" : "UnaryExpression")
			} else if (!Q && this.type === W.privateId) {
				if ((q || this.privateNameStack.length === 0) && this.options.checkPrivateFields) this
					.unexpected();
				if (j = this.parsePrivateIdent(), this.type !== W._in) this.unexpected()
			} else {
				if (j = this.parseExprSubscripts(J, q), this.checkExpressionErrors(J)) return j;
				while (this.type.postfix && !this.canInsertSemicolon()) {
					var R = this.startNodeAt(X, Y);
					R.operator = this.value, R.prefix = !1, R.argument = j, this.checkLValSimple(j), this
					.next(), j = this.finishNode(R, "UpdateExpression")
				}
			}
			if (!Z && this.eat(W.starstar))
				if (Q) this.unexpected(this.lastTokStart);
				else return this.buildBinary(X, Y, j, this.parseMaybeUnary(null, !1, !1, q), "**", !1);
			else return j
		};

		function dJ(J) {
			return J.type === "Identifier" || J.type === "ParenthesizedExpression" && dJ(J.expression)
		}

		function SJ(J) {
			return J.type === "MemberExpression" && J.property.type === "PrivateIdentifier" || J.type ===
				"ChainExpression" && SJ(J.expression) || J.type === "ParenthesizedExpression" && SJ(J.expression)
		}
		F.parseExprSubscripts = function(J, Q) {
			var Z = this.start,
				q = this.startLoc,
				X = this.parseExprAtom(J, Q);
			if (X.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !==
				")") return X;
			var Y = this.parseSubscripts(X, Z, q, !1, Q);
			if (J && Y.type === "MemberExpression") {
				if (J.parenthesizedAssign >= Y.start) J.parenthesizedAssign = -1;
				if (J.parenthesizedBind >= Y.start) J.parenthesizedBind = -1;
				if (J.trailingComma >= Y.start) J.trailingComma = -1
			}
			return Y
		}, F.parseSubscripts = function(J, Q, Z, q, X) {
			var Y = this.options.ecmaVersion >= 8 && J.type === "Identifier" && J.name === "async" && this
				.lastTokEnd === J.end && !this.canInsertSemicolon() && J.end - J.start === 5 && this
				.potentialArrowAt === J.start,
				j = !1;
			while (!0) {
				var H = this.parseSubscript(J, Q, Z, q, Y, j, X);
				if (H.optional) j = !0;
				if (H === J || H.type === "ArrowFunctionExpression") {
					if (j) {
						var K = this.startNodeAt(Q, Z);
						K.expression = H, H = this.finishNode(K, "ChainExpression")
					}
					return H
				}
				J = H
			}
		}, F.shouldParseAsyncArrow = function() {
			return !this.canInsertSemicolon() && this.eat(W.arrow)
		}, F.parseSubscriptAsyncArrow = function(J, Q, Z, q) {
			return this.parseArrowExpression(this.startNodeAt(J, Q), Z, !0, q)
		}, F.parseSubscript = function(J, Q, Z, q, X, Y, j) {
			var H = this.options.ecmaVersion >= 11,
				K = H && this.eat(W.questionDot);
			if (q && K) this.raise(this.lastTokStart,
				"Optional chaining cannot appear in the callee of new expressions");
			var R = this.eat(W.bracketL);
			if (R || K && this.type !== W.parenL && this.type !== W.backQuote || this.eat(W.dot)) {
				var M = this.startNodeAt(Q, Z);
				if (M.object = J, R) M.property = this.parseExpression(), this.expect(W.bracketR);
				else if (this.type === W.privateId && J.type !== "Super") M.property = this.parsePrivateIdent();
				else M.property = this.parseIdent(this.options.allowReserved !== "never");
				if (M.computed = !!R, H) M.optional = K;
				J = this.finishNode(M, "MemberExpression")
			} else if (!q && this.eat(W.parenL)) {
				var N = new KJ,
					v = this.yieldPos,
					qJ = this.awaitPos,
					a = this.awaitIdentPos;
				this.yieldPos = 0, this.awaitPos = 0, this.awaitIdentPos = 0;
				var VJ = this.parseExprList(W.parenR, this.options.ecmaVersion >= 8, !1, N);
				if (X && !K && this.shouldParseAsyncArrow()) {
					if (this.checkPatternErrors(N, !1), this.checkYieldAwaitInDefaultParams(), this
						.awaitIdentPos > 0) this.raise(this.awaitIdentPos,
						"Cannot use 'await' as identifier inside an async function");
					return this.yieldPos = v, this.awaitPos = qJ, this.awaitIdentPos = a, this
						.parseSubscriptAsyncArrow(Q, Z, VJ, j)
				}
				this.checkExpressionErrors(N, !0), this.yieldPos = v || this.yieldPos, this.awaitPos = qJ ||
					this.awaitPos, this.awaitIdentPos = a || this.awaitIdentPos;
				var o = this.startNodeAt(Q, Z);
				if (o.callee = J, o.arguments = VJ, H) o.optional = K;
				J = this.finishNode(o, "CallExpression")
			} else if (this.type === W.backQuote) {
				if (K || Y) this.raise(this.start,
					"Optional chaining cannot appear in the tag of tagged template expressions");
				var r = this.startNodeAt(Q, Z);
				r.tag = J, r.quasi = this.parseTemplate({
					isTagged: !0
				}), J = this.finishNode(r, "TaggedTemplateExpression")
			}
			return J
		}, F.parseExprAtom = function(J, Q, Z) {
			if (this.type === W.slash) this.readRegexp();
			var q, X = this.potentialArrowAt === this.start;
			switch (this.type) {
				case W._super:
					if (!this.allowSuper) this.raise(this.start, "'super' keyword outside a method");
					if (q = this.startNode(), this.next(), this.type === W.parenL && !this.allowDirectSuper)
						this.raise(q.start, "super() call outside constructor of a subclass");
					if (this.type !== W.dot && this.type !== W.bracketL && this.type !== W.parenL) this
						.unexpected();
					return this.finishNode(q, "Super");
				case W._this:
					return q = this.startNode(), this.next(), this.finishNode(q, "ThisExpression");
				case W.name:
					var Y = this.start,
						j = this.startLoc,
						H = this.containsEsc,
						K = this.parseIdent(!1);
					if (this.options.ecmaVersion >= 8 && !H && K.name === "async" && !this
					.canInsertSemicolon() && this.eat(W._function)) return this.overrideContext(U.f_expr), this
						.parseFunction(this.startNodeAt(Y, j), 0, !1, !0, Q);
					if (X && !this.canInsertSemicolon()) {
						if (this.eat(W.arrow)) return this.parseArrowExpression(this.startNodeAt(Y, j), [K], !1,
							Q);
						if (this.options.ecmaVersion >= 8 && K.name === "async" && this.type === W.name && !H &&
							(!this.potentialArrowInForAwait || this.value !== "of" || this.containsEsc)) {
							if (K = this.parseIdent(!1), this.canInsertSemicolon() || !this.eat(W.arrow)) this
								.unexpected();
							return this.parseArrowExpression(this.startNodeAt(Y, j), [K], !0, Q)
						}
					}
					return K;
				case W.regexp:
					var R = this.value;
					return q = this.parseLiteral(R.value), q.regex = {
						pattern: R.pattern,
						flags: R.flags
					}, q;
				case W.num:
				case W.string:
					return this.parseLiteral(this.value);
				case W._null:
				case W._true:
				case W._false:
					return q = this.startNode(), q.value = this.type === W._null ? null : this.type === W._true,
						q.raw = this.type.keyword, this.next(), this.finishNode(q, "Literal");
				case W.parenL:
					var M = this.start,
						N = this.parseParenAndDistinguishExpression(X, Q);
					if (J) {
						if (J.parenthesizedAssign < 0 && !this.isSimpleAssignTarget(N)) J.parenthesizedAssign =
							M;
						if (J.parenthesizedBind < 0) J.parenthesizedBind = M
					}
					return N;
				case W.bracketL:
					return q = this.startNode(), this.next(), q.elements = this.parseExprList(W.bracketR, !0, !
						0, J), this.finishNode(q, "ArrayExpression");
				case W.braceL:
					return this.overrideContext(U.b_expr), this.parseObj(!1, J);
				case W._function:
					return q = this.startNode(), this.next(), this.parseFunction(q, 0);
				case W._class:
					return this.parseClass(this.startNode(), !1);
				case W._new:
					return this.parseNew();
				case W.backQuote:
					return this.parseTemplate();
				case W._import:
					if (this.options.ecmaVersion >= 11) return this.parseExprImport(Z);
					else return this.unexpected();
				default:
					return this.parseExprAtomDefault()
			}
		}, F.parseExprAtomDefault = function() {
			this.unexpected()
		}, F.parseExprImport = function(J) {
			var Q = this.startNode();
			if (this.containsEsc) this.raiseRecoverable(this.start, "Escape sequence in keyword import");
			if (this.next(), this.type === W.parenL && !J) return this.parseDynamicImport(Q);
			else if (this.type === W.dot) {
				var Z = this.startNodeAt(Q.start, Q.loc && Q.loc.start);
				return Z.name = "import", Q.meta = this.finishNode(Z, "Identifier"), this.parseImportMeta(Q)
			} else this.unexpected()
		}, F.parseDynamicImport = function(J) {
			if (this.next(), J.source = this.parseMaybeAssign(), this.options.ecmaVersion >= 16)
				if (!this.eat(W.parenR))
					if (this.expect(W.comma), !this.afterTrailingComma(W.parenR)) {
						if (J.options = this.parseMaybeAssign(), !this.eat(W.parenR)) {
							if (this.expect(W.comma), !this.afterTrailingComma(W.parenR)) this.unexpected()
						}
					} else J.options = null;
			else J.options = null;
			else if (!this.eat(W.parenR)) {
				var Q = this.start;
				if (this.eat(W.comma) && this.eat(W.parenR)) this.raiseRecoverable(Q,
					"Trailing comma is not allowed in import()");
				else this.unexpected(Q)
			}
			return this.finishNode(J, "ImportExpression")
		}, F.parseImportMeta = function(J) {
			this.next();
			var Q = this.containsEsc;
			if (J.property = this.parseIdent(!0), J.property.name !== "meta") this.raiseRecoverable(J.property
				.start, "The only valid meta property for import is 'import.meta'");
			if (Q) this.raiseRecoverable(J.start, "'import.meta' must not contain escaped characters");
			if (this.options.sourceType !== "module" && !this.options.allowImportExportEverywhere) this
				.raiseRecoverable(J.start, "Cannot use 'import.meta' outside a module");
			return this.finishNode(J, "MetaProperty")
		}, F.parseLiteral = function(J) {
			var Q = this.startNode();
			if (Q.value = J, Q.raw = this.input.slice(this.start, this.end), Q.raw.charCodeAt(Q.raw.length -
				1) === 110) Q.bigint = Q.value != null ? Q.value.toString() : Q.raw.slice(0, -1).replace(/_/g,
				"");
			return this.next(), this.finishNode(Q, "Literal")
		}, F.parseParenExpression = function() {
			this.expect(W.parenL);
			var J = this.parseExpression();
			return this.expect(W.parenR), J
		}, F.shouldParseArrow = function(J) {
			return !this.canInsertSemicolon()
		}, F.parseParenAndDistinguishExpression = function(J, Q) {
			var Z = this.start,
				q = this.startLoc,
				X, Y = this.options.ecmaVersion >= 8;
			if (this.options.ecmaVersion >= 6) {
				this.next();
				var j = this.start,
					H = this.startLoc,
					K = [],
					R = !0,
					M = !1,
					N = new KJ,
					v = this.yieldPos,
					qJ = this.awaitPos,
					a;
				this.yieldPos = 0, this.awaitPos = 0;
				while (this.type !== W.parenR)
					if (R ? R = !1 : this.expect(W.comma), Y && this.afterTrailingComma(W.parenR, !0)) {
						M = !0;
						break
					} else if (this.type === W.ellipsis) {
					if (a = this.start, K.push(this.parseParenItem(this.parseRestBinding())), this.type === W
						.comma) this.raiseRecoverable(this.start,
						"Comma is not permitted after the rest element");
					break
				} else K.push(this.parseMaybeAssign(!1, N, this.parseParenItem));
				var VJ = this.lastTokEnd,
					o = this.lastTokEndLoc;
				if (this.expect(W.parenR), J && this.shouldParseArrow(K) && this.eat(W.arrow)) return this
					.checkPatternErrors(N, !1), this.checkYieldAwaitInDefaultParams(), this.yieldPos = v,
					this.awaitPos = qJ, this.parseParenArrowList(Z, q, K, Q);
				if (!K.length || M) this.unexpected(this.lastTokStart);
				if (a) this.unexpected(a);
				if (this.checkExpressionErrors(N, !0), this.yieldPos = v || this.yieldPos, this.awaitPos = qJ ||
					this.awaitPos, K.length > 1) X = this.startNodeAt(j, H), X.expressions = K, this
					.finishNodeAt(X, "SequenceExpression", VJ, o);
				else X = K[0]
			} else X = this.parseParenExpression();
			if (this.options.preserveParens) {
				var r = this.startNodeAt(Z, q);
				return r.expression = X, this.finishNode(r, "ParenthesizedExpression")
			} else return X
		}, F.parseParenItem = function(J) {
			return J
		}, F.parseParenArrowList = function(J, Q, Z, q) {
			return this.parseArrowExpression(this.startNodeAt(J, Q), Z, !1, q)
		};
		var TQ = [];
		F.parseNew = function() {
			if (this.containsEsc) this.raiseRecoverable(this.start, "Escape sequence in keyword new");
			var J = this.startNode();
			if (this.next(), this.options.ecmaVersion >= 6 && this.type === W.dot) {
				var Q = this.startNodeAt(J.start, J.loc && J.loc.start);
				Q.name = "new", J.meta = this.finishNode(Q, "Identifier"), this.next();
				var Z = this.containsEsc;
				if (J.property = this.parseIdent(!0), J.property.name !== "target") this.raiseRecoverable(J
					.property.start, "The only valid meta property for new is 'new.target'");
				if (Z) this.raiseRecoverable(J.start, "'new.target' must not contain escaped characters");
				if (!this.allowNewDotTarget) this.raiseRecoverable(J.start,
					"'new.target' can only be used in functions and class static block");
				return this.finishNode(J, "MetaProperty")
			}
			var q = this.start,
				X = this.startLoc;
			if (J.callee = this.parseSubscripts(this.parseExprAtom(null, !1, !0), q, X, !0, !1), this.eat(W
					.parenL)) J.arguments = this.parseExprList(W.parenR, this.options.ecmaVersion >= 8, !1);
			else J.arguments = TQ;
			return this.finishNode(J, "NewExpression")
		}, F.parseTemplateElement = function(J) {
			var Q = J.isTagged,
				Z = this.startNode();
			if (this.type === W.invalidTemplate) {
				if (!Q) this.raiseRecoverable(this.start, "Bad escape sequence in untagged template literal");
				Z.value = {
					raw: this.value.replace(/\r\n?/g, `
`),
					cooked: null
				}
			} else Z.value = {
				raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, `
`),
				cooked: this.value
			};
			return this.next(), Z.tail = this.type === W.backQuote, this.finishNode(Z, "TemplateElement")
		}, F.parseTemplate = function(J) {
			if (J === void 0) J = {};
			var Q = J.isTagged;
			if (Q === void 0) Q = !1;
			var Z = this.startNode();
			this.next(), Z.expressions = [];
			var q = this.parseTemplateElement({
				isTagged: Q
			});
			Z.quasis = [q];
			while (!q.tail) {
				if (this.type === W.eof) this.raise(this.pos, "Unterminated template literal");
				this.expect(W.dollarBraceL), Z.expressions.push(this.parseExpression()), this.expect(W.braceR),
					Z.quasis.push(q = this.parseTemplateElement({
						isTagged: Q
					}))
			}
			return this.next(), this.finishNode(Z, "TemplateLiteral")
		}, F.isAsyncProp = function(J) {
			return !J.computed && J.key.type === "Identifier" && J.key.name === "async" && (this.type === W
				.name || this.type === W.num || this.type === W.string || this.type === W.bracketL || this
				.type.keyword || this.options.ecmaVersion >= 9 && this.type === W.star) && !b.test(this
				.input.slice(this.lastTokEnd, this.start))
		}, F.parseObj = function(J, Q) {
			var Z = this.startNode(),
				q = !0,
				X = {};
			Z.properties = [], this.next();
			while (!this.eat(W.braceR)) {
				if (!q) {
					if (this.expect(W.comma), this.options.ecmaVersion >= 5 && this.afterTrailingComma(W
						.braceR)) break
				} else q = !1;
				var Y = this.parseProperty(J, Q);
				if (!J) this.checkPropClash(Y, X, Q);
				Z.properties.push(Y)
			}
			return this.finishNode(Z, J ? "ObjectPattern" : "ObjectExpression")
		}, F.parseProperty = function(J, Q) {
			var Z = this.startNode(),
				q, X, Y, j;
			if (this.options.ecmaVersion >= 9 && this.eat(W.ellipsis)) {
				if (J) {
					if (Z.argument = this.parseIdent(!1), this.type === W.comma) this.raiseRecoverable(this
						.start, "Comma is not permitted after the rest element");
					return this.finishNode(Z, "RestElement")
				}
				if (Z.argument = this.parseMaybeAssign(!1, Q), this.type === W.comma && Q && Q.trailingComma <
					0) Q.trailingComma = this.start;
				return this.finishNode(Z, "SpreadElement")
			}
			if (this.options.ecmaVersion >= 6) {
				if (Z.method = !1, Z.shorthand = !1, J || Q) Y = this.start, j = this.startLoc;
				if (!J) q = this.eat(W.star)
			}
			var H = this.containsEsc;
			if (this.parsePropertyName(Z), !J && !H && this.options.ecmaVersion >= 8 && !q && this.isAsyncProp(
					Z)) X = !0, q = this.options.ecmaVersion >= 9 && this.eat(W.star), this.parsePropertyName(
			Z);
			else X = !1;
			return this.parsePropertyValue(Z, J, q, X, Y, j, Q, H), this.finishNode(Z, "Property")
		}, F.parseGetterSetter = function(J) {
			var Q = J.key.name;
			this.parsePropertyName(J), J.value = this.parseMethod(!1), J.kind = Q;
			var Z = J.kind === "get" ? 0 : 1;
			if (J.value.params.length !== Z) {
				var q = J.value.start;
				if (J.kind === "get") this.raiseRecoverable(q, "getter should have no params");
				else this.raiseRecoverable(q, "setter should have exactly one param")
			} else if (J.kind === "set" && J.value.params[0].type === "RestElement") this.raiseRecoverable(J
				.value.params[0].start, "Setter cannot use rest params")
		}, F.parsePropertyValue = function(J, Q, Z, q, X, Y, j, H) {
			if ((Z || q) && this.type === W.colon) this.unexpected();
			if (this.eat(W.colon)) J.value = Q ? this.parseMaybeDefault(this.start, this.startLoc) : this
				.parseMaybeAssign(!1, j), J.kind = "init";
			else if (this.options.ecmaVersion >= 6 && this.type === W.parenL) {
				if (Q) this.unexpected();
				J.method = !0, J.value = this.parseMethod(Z, q), J.kind = "init"
			} else if (!Q && !H && this.options.ecmaVersion >= 5 && !J.computed && J.key.type ===
				"Identifier" && (J.key.name === "get" || J.key.name === "set") && (this.type !== W.comma && this
					.type !== W.braceR && this.type !== W.eq)) {
				if (Z || q) this.unexpected();
				this.parseGetterSetter(J)
			} else if (this.options.ecmaVersion >= 6 && !J.computed && J.key.type === "Identifier") {
				if (Z || q) this.unexpected();
				if (this.checkUnreserved(J.key), J.key.name === "await" && !this.awaitIdentPos) this
					.awaitIdentPos = X;
				if (Q) J.value = this.parseMaybeDefault(X, Y, this.copyNode(J.key));
				else if (this.type === W.eq && j) {
					if (j.shorthandAssign < 0) j.shorthandAssign = this.start;
					J.value = this.parseMaybeDefault(X, Y, this.copyNode(J.key))
				} else J.value = this.copyNode(J.key);
				J.kind = "init", J.shorthand = !0
			} else this.unexpected()
		}, F.parsePropertyName = function(J) {
			if (this.options.ecmaVersion >= 6)
				if (this.eat(W.bracketL)) return J.computed = !0, J.key = this.parseMaybeAssign(), this.expect(W
					.bracketR), J.key;
				else J.computed = !1;
			return J.key = this.type === W.num || this.type === W.string ? this.parseExprAtom() : this
				.parseIdent(this.options.allowReserved !== "never")
		}, F.initFunction = function(J) {
			if (J.id = null, this.options.ecmaVersion >= 6) J.generator = J.expression = !1;
			if (this.options.ecmaVersion >= 8) J.async = !1
		}, F.parseMethod = function(J, Q, Z) {
			var q = this.startNode(),
				X = this.yieldPos,
				Y = this.awaitPos,
				j = this.awaitIdentPos;
			if (this.initFunction(q), this.options.ecmaVersion >= 6) q.generator = J;
			if (this.options.ecmaVersion >= 8) q.async = !!Q;
			return this.yieldPos = 0, this.awaitPos = 0, this.awaitIdentPos = 0, this.enterScope(bJ(Q, q
					.generator) | YJ | (Z ? fJ : 0)), this.expect(W.parenL), q.params = this.parseBindingList(W
					.parenR, !1, this.options.ecmaVersion >= 8), this.checkYieldAwaitInDefaultParams(), this
				.parseFunctionBody(q, !1, !0, !1), this.yieldPos = X, this.awaitPos = Y, this.awaitIdentPos = j,
				this.finishNode(q, "FunctionExpression")
		}, F.parseArrowExpression = function(J, Q, Z, q) {
			var X = this.yieldPos,
				Y = this.awaitPos,
				j = this.awaitIdentPos;
			if (this.enterScope(bJ(Z, !1) | vJ), this.initFunction(J), this.options.ecmaVersion >= 8) J
				.async = !!Z;
			return this.yieldPos = 0, this.awaitPos = 0, this.awaitIdentPos = 0, J.params = this
				.toAssignableList(Q, !0), this.parseFunctionBody(J, !0, !1, q), this.yieldPos = X, this
				.awaitPos = Y, this.awaitIdentPos = j, this.finishNode(J, "ArrowFunctionExpression")
		}, F.parseFunctionBody = function(J, Q, Z, q) {
			var X = Q && this.type !== W.braceL,
				Y = this.strict,
				j = !1;
			if (X) J.body = this.parseMaybeAssign(q), J.expression = !0, this.checkParams(J, !1);
			else {
				var H = this.options.ecmaVersion >= 7 && !this.isSimpleParamList(J.params);
				if (!Y || H) {
					if (j = this.strictDirective(this.end), j && H) this.raiseRecoverable(J.start,
						"Illegal 'use strict' directive in function with non-simple parameter list")
				}
				var K = this.labels;
				if (this.labels = [], j) this.strict = !0;
				if (this.checkParams(J, !Y && !j && !Q && !Z && this.isSimpleParamList(J.params)), this
					.strict && J.id) this.checkLValSimple(J.id, pJ);
				J.body = this.parseBlock(!1, void 0, j && !Y), J.expression = !1, this.adaptDirectivePrologue(J
					.body.body), this.labels = K
			}
			this.exitScope()
		}, F.isSimpleParamList = function(J) {
			for (var Q = 0, Z = J; Q < Z.length; Q += 1) {
				var q = Z[Q];
				if (q.type !== "Identifier") return !1
			}
			return !0
		}, F.checkParams = function(J, Q) {
			var Z = Object.create(null);
			for (var q = 0, X = J.params; q < X.length; q += 1) {
				var Y = X[q];
				this.checkLValInnerPattern(Y, AJ, Q ? null : Z)
			}
		}, F.parseExprList = function(J, Q, Z, q) {
			var X = [],
				Y = !0;
			while (!this.eat(J)) {
				if (!Y) {
					if (this.expect(W.comma), Q && this.afterTrailingComma(J)) break
				} else Y = !1;
				var j = void 0;
				if (Z && this.type === W.comma) j = null;
				else if (this.type === W.ellipsis) {
					if (j = this.parseSpread(q), q && this.type === W.comma && q.trailingComma < 0) q
						.trailingComma = this.start
				} else j = this.parseMaybeAssign(!1, q);
				X.push(j)
			}
			return X
		}, F.checkUnreserved = function(J) {
			var {
				start: Q,
				end: Z,
				name: q
			} = J;
			if (this.inGenerator && q === "yield") this.raiseRecoverable(Q,
				"Cannot use 'yield' as identifier inside a generator");
			if (this.inAsync && q === "await") this.raiseRecoverable(Q,
				"Cannot use 'await' as identifier inside an async function");
			if (!(this.currentThisScope().flags & jJ) && q === "arguments") this.raiseRecoverable(Q,
				"Cannot use 'arguments' in class field initializer");
			if (this.inClassStaticBlock && (q === "arguments" || q === "await")) this.raise(Q, "Cannot use " +
				q + " in class static initialization block");
			if (this.keywords.test(q)) this.raise(Q, "Unexpected keyword '" + q + "'");
			if (this.options.ecmaVersion < 6 && this.input.slice(Q, Z).indexOf("\\") !== -1) return;
			var X = this.strict ? this.reservedWordsStrict : this.reservedWords;
			if (X.test(q)) {
				if (!this.inAsync && q === "await") this.raiseRecoverable(Q,
					"Cannot use keyword 'await' outside an async function");
				this.raiseRecoverable(Q, "The keyword '" + q + "' is reserved")
			}
		}, F.parseIdent = function(J) {
			var Q = this.parseIdentNode();
			if (this.next(!!J), this.finishNode(Q, "Identifier"), !J) {
				if (this.checkUnreserved(Q), Q.name === "await" && !this.awaitIdentPos) this.awaitIdentPos = Q
					.start
			}
			return Q
		}, F.parseIdentNode = function() {
			var J = this.startNode();
			if (this.type === W.name) J.name = this.value;
			else if (this.type.keyword) {
				if (J.name = this.type.keyword, (J.name === "class" || J.name === "function") && (this
						.lastTokEnd !== this.lastTokStart + 1 || this.input.charCodeAt(this.lastTokStart) !== 46
						)) this.context.pop();
				this.type = W.name
			} else this.unexpected();
			return J
		}, F.parsePrivateIdent = function() {
			var J = this.startNode();
			if (this.type === W.privateId) J.name = this.value;
			else this.unexpected();
			if (this.next(), this.finishNode(J, "PrivateIdentifier"), this.options.checkPrivateFields)
				if (this.privateNameStack.length === 0) this.raise(J.start, "Private field '#" + J.name +
					"' must be declared in an enclosing class");
				else this.privateNameStack[this.privateNameStack.length - 1].used.push(J);
			return J
		}, F.parseYield = function(J) {
			if (!this.yieldPos) this.yieldPos = this.start;
			var Q = this.startNode();
			if (this.next(), this.type === W.semi || this.canInsertSemicolon() || this.type !== W.star && !this
				.type.startsExpr) Q.delegate = !1, Q.argument = null;
			else Q.delegate = this.eat(W.star), Q.argument = this.parseMaybeAssign(J);
			return this.finishNode(Q, "YieldExpression")
		}, F.parseAwait = function(J) {
			if (!this.awaitPos) this.awaitPos = this.start;
			var Q = this.startNode();
			return this.next(), Q.argument = this.parseMaybeUnary(null, !0, !1, J), this.finishNode(Q,
				"AwaitExpression")
		};
		var GJ = $.prototype;
		GJ.raise = function(J, Q) {
			var Z = $J(this.input, J);
			if (Q += " (" + Z.line + ":" + Z.column + ")", this.sourceFile) Q += " in " + this.sourceFile;
			var q = new SyntaxError(Q);
			throw q.pos = J, q.loc = Z, q.raisedAt = this.pos, q
		}, GJ.raiseRecoverable = GJ.raise, GJ.curPosition = function() {
			if (this.options.locations) return new d(this.curLine, this.pos - this.lineStart)
		};
		var u = $.prototype,
			DQ = function J(Q) {
				this.flags = Q, this.var = [], this.lexical = [], this.functions = []
			};
		u.enterScope = function(J) {
			this.scopeStack.push(new DQ(J))
		}, u.exitScope = function() {
			this.scopeStack.pop()
		}, u.treatFunctionsAsVarInScope = function(J) {
			return J.flags & i || !this.inModule && J.flags & t
		}, u.declareName = function(J, Q, Z) {
			var q = !1;
			if (Q === m) {
				var X = this.currentScope();
				if (q = X.lexical.indexOf(J) > -1 || X.functions.indexOf(J) > -1 || X.var.indexOf(J) > -1, X
					.lexical.push(J), this.inModule && X.flags & t) delete this.undefinedExports[J]
			} else if (Q === lJ) {
				var Y = this.currentScope();
				Y.lexical.push(J)
			} else if (Q === uJ) {
				var j = this.currentScope();
				if (this.treatFunctionsAsVar) q = j.lexical.indexOf(J) > -1;
				else q = j.lexical.indexOf(J) > -1 || j.var.indexOf(J) > -1;
				j.functions.push(J)
			} else
				for (var H = this.scopeStack.length - 1; H >= 0; --H) {
					var K = this.scopeStack[H];
					if (K.lexical.indexOf(J) > -1 && !(K.flags & hJ && K.lexical[0] === J) || !this
						.treatFunctionsAsVarInScope(K) && K.functions.indexOf(J) > -1) {
						q = !0;
						break
					}
					if (K.var.push(J), this.inModule && K.flags & t) delete this.undefinedExports[J];
					if (K.flags & jJ) break
				}
			if (q) this.raiseRecoverable(Z, "Identifier '" + J + "' has already been declared")
		}, u.checkLocalExport = function(J) {
			if (this.scopeStack[0].lexical.indexOf(J.name) === -1 && this.scopeStack[0].var.indexOf(J.name) ===
				-1) this.undefinedExports[J.name] = J
		}, u.currentScope = function() {
			return this.scopeStack[this.scopeStack.length - 1]
		}, u.currentVarScope = function() {
			for (var J = this.scopeStack.length - 1;; J--) {
				var Q = this.scopeStack[J];
				if (Q.flags & (jJ | e | p)) return Q
			}
		}, u.currentThisScope = function() {
			for (var J = this.scopeStack.length - 1;; J--) {
				var Q = this.scopeStack[J];
				if (Q.flags & (jJ | e | p) && !(Q.flags & vJ)) return Q
			}
		};
		var QJ = function J(Q, Z, q) {
				if (this.type = "", this.start = Z, this.end = 0, Q.options.locations) this.loc = new s(Q, q);
				if (Q.options.directSourceFile) this.sourceFile = Q.options.directSourceFile;
				if (Q.options.ranges) this.range = [Z, 0]
			},
			ZJ = $.prototype;
		ZJ.startNode = function() {
			return new QJ(this, this.start, this.startLoc)
		}, ZJ.startNodeAt = function(J, Q) {
			return new QJ(this, J, Q)
		};

		function iJ(J, Q, Z, q) {
			if (J.type = Q, J.end = Z, this.options.locations) J.loc.end = q;
			if (this.options.ranges) J.range[1] = Z;
			return J
		}
		ZJ.finishNode = function(J, Q) {
			return iJ.call(this, J, Q, this.lastTokEnd, this.lastTokEndLoc)
		}, ZJ.finishNodeAt = function(J, Q, Z, q) {
			return iJ.call(this, J, Q, Z, q)
		}, ZJ.copyNode = function(J) {
			var Q = new QJ(this, J.start, this.startLoc);
			for (var Z in J) Q[Z] = J[Z];
			return Q
		};
		var EQ =
			"Gara Garay Gukh Gurung_Khema Hrkt Katakana_Or_Hiragana Kawi Kirat_Rai Krai Nag_Mundari Nagm Ol_Onal Onao Sunu Sunuwar Todhri Todr Tulu_Tigalari Tutg Unknown Zzzz",
			nJ =
			"ASCII ASCII_Hex_Digit AHex Alphabetic Alpha Any Assigned Bidi_Control Bidi_C Bidi_Mirrored Bidi_M Case_Ignorable CI Cased Changes_When_Casefolded CWCF Changes_When_Casemapped CWCM Changes_When_Lowercased CWL Changes_When_NFKC_Casefolded CWKCF Changes_When_Titlecased CWT Changes_When_Uppercased CWU Dash Default_Ignorable_Code_Point DI Deprecated Dep Diacritic Dia Emoji Emoji_Component Emoji_Modifier Emoji_Modifier_Base Emoji_Presentation Extender Ext Grapheme_Base Gr_Base Grapheme_Extend Gr_Ext Hex_Digit Hex IDS_Binary_Operator IDSB IDS_Trinary_Operator IDST ID_Continue IDC ID_Start IDS Ideographic Ideo Join_Control Join_C Logical_Order_Exception LOE Lowercase Lower Math Noncharacter_Code_Point NChar Pattern_Syntax Pat_Syn Pattern_White_Space Pat_WS Quotation_Mark QMark Radical Regional_Indicator RI Sentence_Terminal STerm Soft_Dotted SD Terminal_Punctuation Term Unified_Ideograph UIdeo Uppercase Upper Variation_Selector VS White_Space space XID_Continue XIDC XID_Start XIDS",
			aJ = nJ + " Extended_Pictographic",
			oJ = aJ,
			rJ = oJ + " EBase EComp EMod EPres ExtPict",
			sJ = rJ,
			yQ = sJ,
			xQ = {
				9: nJ,
				10: aJ,
				11: oJ,
				12: rJ,
				13: sJ,
				14: yQ
			},
			gQ =
			"Basic_Emoji Emoji_Keycap_Sequence RGI_Emoji_Modifier_Sequence RGI_Emoji_Flag_Sequence RGI_Emoji_Tag_Sequence RGI_Emoji_ZWJ_Sequence RGI_Emoji",
			mQ = {
				9: "",
				10: "",
				11: "",
				12: "",
				13: "",
				14: gQ
			},
			tJ =
			"Cased_Letter LC Close_Punctuation Pe Connector_Punctuation Pc Control Cc cntrl Currency_Symbol Sc Dash_Punctuation Pd Decimal_Number Nd digit Enclosing_Mark Me Final_Punctuation Pf Format Cf Initial_Punctuation Pi Letter L Letter_Number Nl Line_Separator Zl Lowercase_Letter Ll Mark M Combining_Mark Math_Symbol Sm Modifier_Letter Lm Modifier_Symbol Sk Nonspacing_Mark Mn Number N Open_Punctuation Ps Other C Other_Letter Lo Other_Number No Other_Punctuation Po Other_Symbol So Paragraph_Separator Zp Private_Use Co Punctuation P punct Separator Z Space_Separator Zs Spacing_Mark Mc Surrogate Cs Symbol S Titlecase_Letter Lt Unassigned Cn Uppercase_Letter Lu",
			eJ =
			"Adlam Adlm Ahom Anatolian_Hieroglyphs Hluw Arabic Arab Armenian Armn Avestan Avst Balinese Bali Bamum Bamu Bassa_Vah Bass Batak Batk Bengali Beng Bhaiksuki Bhks Bopomofo Bopo Brahmi Brah Braille Brai Buginese Bugi Buhid Buhd Canadian_Aboriginal Cans Carian Cari Caucasian_Albanian Aghb Chakma Cakm Cham Cham Cherokee Cher Common Zyyy Coptic Copt Qaac Cuneiform Xsux Cypriot Cprt Cyrillic Cyrl Deseret Dsrt Devanagari Deva Duployan Dupl Egyptian_Hieroglyphs Egyp Elbasan Elba Ethiopic Ethi Georgian Geor Glagolitic Glag Gothic Goth Grantha Gran Greek Grek Gujarati Gujr Gurmukhi Guru Han Hani Hangul Hang Hanunoo Hano Hatran Hatr Hebrew Hebr Hiragana Hira Imperial_Aramaic Armi Inherited Zinh Qaai Inscriptional_Pahlavi Phli Inscriptional_Parthian Prti Javanese Java Kaithi Kthi Kannada Knda Katakana Kana Kayah_Li Kali Kharoshthi Khar Khmer Khmr Khojki Khoj Khudawadi Sind Lao Laoo Latin Latn Lepcha Lepc Limbu Limb Linear_A Lina Linear_B Linb Lisu Lisu Lycian Lyci Lydian Lydi Mahajani Mahj Malayalam Mlym Mandaic Mand Manichaean Mani Marchen Marc Masaram_Gondi Gonm Meetei_Mayek Mtei Mende_Kikakui Mend Meroitic_Cursive Merc Meroitic_Hieroglyphs Mero Miao Plrd Modi Mongolian Mong Mro Mroo Multani Mult Myanmar Mymr Nabataean Nbat New_Tai_Lue Talu Newa Newa Nko Nkoo Nushu Nshu Ogham Ogam Ol_Chiki Olck Old_Hungarian Hung Old_Italic Ital Old_North_Arabian Narb Old_Permic Perm Old_Persian Xpeo Old_South_Arabian Sarb Old_Turkic Orkh Oriya Orya Osage Osge Osmanya Osma Pahawh_Hmong Hmng Palmyrene Palm Pau_Cin_Hau Pauc Phags_Pa Phag Phoenician Phnx Psalter_Pahlavi Phlp Rejang Rjng Runic Runr Samaritan Samr Saurashtra Saur Sharada Shrd Shavian Shaw Siddham Sidd SignWriting Sgnw Sinhala Sinh Sora_Sompeng Sora Soyombo Soyo Sundanese Sund Syloti_Nagri Sylo Syriac Syrc Tagalog Tglg Tagbanwa Tagb Tai_Le Tale Tai_Tham Lana Tai_Viet Tavt Takri Takr Tamil Taml Tangut Tang Telugu Telu Thaana Thaa Thai Thai Tibetan Tibt Tifinagh Tfng Tirhuta Tirh Ugaritic Ugar Vai Vaii Warang_Citi Wara Yi Yiii Zanabazar_Square Zanb",
			JQ = eJ +
			" Dogra Dogr Gunjala_Gondi Gong Hanifi_Rohingya Rohg Makasar Maka Medefaidrin Medf Old_Sogdian Sogo Sogdian Sogd",
			QQ = JQ + " Elymaic Elym Nandinagari Nand Nyiakeng_Puachue_Hmong Hmnp Wancho Wcho",
			ZQ = QQ + " Chorasmian Chrs Diak Dives_Akuru Khitan_Small_Script Kits Yezi Yezidi",
			qQ = ZQ + " Cypro_Minoan Cpmn Old_Uyghur Ougr Tangsa Tnsa Toto Vithkuqi Vith",
			hQ = qQ + " " + EQ,
			fQ = {
				9: eJ,
				10: JQ,
				11: QQ,
				12: ZQ,
				13: qQ,
				14: hQ
			},
			WQ = {};

		function uQ(J) {
			var Q = WQ[J] = {
				binary: f(xQ[J] + " " + tJ),
				binaryOfStrings: f(mQ[J]),
				nonBinary: {
					General_Category: f(tJ),
					Script: f(fQ[J])
				}
			};
			Q.nonBinary.Script_Extensions = Q.nonBinary.Script, Q.nonBinary.gc = Q.nonBinary.General_Category, Q
				.nonBinary.sc = Q.nonBinary.Script, Q.nonBinary.scx = Q.nonBinary.Script_Extensions
		}
		for (var LJ = 0, XQ = [9, 10, 11, 12, 13, 14]; LJ < XQ.length; LJ += 1) {
			var lQ = XQ[LJ];
			uQ(lQ)
		}
		var z = $.prototype,
			RJ = function J(Q, Z) {
				this.parent = Q, this.base = Z || this
			};
		RJ.prototype.separatedFrom = function J(Q) {
			for (var Z = this; Z; Z = Z.parent)
				for (var q = Q; q; q = q.parent)
					if (Z.base === q.base && Z !== q) return !0;
			return !1
		}, RJ.prototype.sibling = function J() {
			return new RJ(this.parent, this.base)
		};
		var y = function J(Q) {
			this.parser = Q, this.validFlags = "gim" + (Q.options.ecmaVersion >= 6 ? "uy" : "") + (Q.options
					.ecmaVersion >= 9 ? "s" : "") + (Q.options.ecmaVersion >= 13 ? "d" : "") + (Q.options
					.ecmaVersion >= 15 ? "v" : ""), this.unicodeProperties = WQ[Q.options.ecmaVersion >= 14 ?
					14 : Q.options.ecmaVersion], this.source = "", this.flags = "", this.start = 0, this
				.switchU = !1, this.switchV = !1, this.switchN = !1, this.pos = 0, this.lastIntValue = 0, this
				.lastStringValue = "", this.lastAssertionIsQuantifiable = !1, this.numCapturingParens = 0, this
				.maxBackReference = 0, this.groupNames = Object.create(null), this.backReferenceNames = [], this
				.branchID = null
		};
		y.prototype.reset = function J(Q, Z, q) {
			var X = q.indexOf("v") !== -1,
				Y = q.indexOf("u") !== -1;
			if (this.start = Q | 0, this.source = Z + "", this.flags = q, X && this.parser.options
				.ecmaVersion >= 15) this.switchU = !0, this.switchV = !0, this.switchN = !0;
			else this.switchU = Y && this.parser.options.ecmaVersion >= 6, this.switchV = !1, this.switchN =
				Y && this.parser.options.ecmaVersion >= 9
		}, y.prototype.raise = function J(Q) {
			this.parser.raiseRecoverable(this.start, "Invalid regular expression: /" + this.source + "/: " + Q)
		}, y.prototype.at = function J(Q, Z) {
			if (Z === void 0) Z = !1;
			var q = this.source,
				X = q.length;
			if (Q >= X) return -1;
			var Y = q.charCodeAt(Q);
			if (!(Z || this.switchU) || Y <= 55295 || Y >= 57344 || Q + 1 >= X) return Y;
			var j = q.charCodeAt(Q + 1);
			return j >= 56320 && j <= 57343 ? (Y << 10) + j - 56613888 : Y
		}, y.prototype.nextIndex = function J(Q, Z) {
			if (Z === void 0) Z = !1;
			var q = this.source,
				X = q.length;
			if (Q >= X) return X;
			var Y = q.charCodeAt(Q),
				j;
			if (!(Z || this.switchU) || Y <= 55295 || Y >= 57344 || Q + 1 >= X || (j = q.charCodeAt(Q + 1)) <
				56320 || j > 57343) return Q + 1;
			return Q + 2
		}, y.prototype.current = function J(Q) {
			if (Q === void 0) Q = !1;
			return this.at(this.pos, Q)
		}, y.prototype.lookahead = function J(Q) {
			if (Q === void 0) Q = !1;
			return this.at(this.nextIndex(this.pos, Q), Q)
		}, y.prototype.advance = function J(Q) {
			if (Q === void 0) Q = !1;
			this.pos = this.nextIndex(this.pos, Q)
		}, y.prototype.eat = function J(Q, Z) {
			if (Z === void 0) Z = !1;
			if (this.current(Z) === Q) return this.advance(Z), !0;
			return !1
		}, y.prototype.eatChars = function J(Q, Z) {
			if (Z === void 0) Z = !1;
			var q = this.pos;
			for (var X = 0, Y = Q; X < Y.length; X += 1) {
				var j = Y[X],
					H = this.at(q, Z);
				if (H === -1 || H !== j) return !1;
				q = this.nextIndex(q, Z)
			}
			return this.pos = q, !0
		}, z.validateRegExpFlags = function(J) {
			var {
				validFlags: Q,
				flags: Z
			} = J, q = !1, X = !1;
			for (var Y = 0; Y < Z.length; Y++) {
				var j = Z.charAt(Y);
				if (Q.indexOf(j) === -1) this.raise(J.start, "Invalid regular expression flag");
				if (Z.indexOf(j, Y + 1) > -1) this.raise(J.start, "Duplicate regular expression flag");
				if (j === "u") q = !0;
				if (j === "v") X = !0
			}
			if (this.options.ecmaVersion >= 15 && q && X) this.raise(J.start, "Invalid regular expression flag")
		};

		function pQ(J) {
			for (var Q in J) return !0;
			return !1
		}
		z.validateRegExpPattern = function(J) {
			if (this.regexp_pattern(J), !J.switchN && this.options.ecmaVersion >= 9 && pQ(J.groupNames)) J
				.switchN = !0, this.regexp_pattern(J)
		}, z.regexp_pattern = function(J) {
			if (J.pos = 0, J.lastIntValue = 0, J.lastStringValue = "", J.lastAssertionIsQuantifiable = !1, J
				.numCapturingParens = 0, J.maxBackReference = 0, J.groupNames = Object.create(null), J
				.backReferenceNames.length = 0, J.branchID = null, this.regexp_disjunction(J), J.pos !== J
				.source.length) {
				if (J.eat(41)) J.raise("Unmatched ')'");
				if (J.eat(93) || J.eat(125)) J.raise("Lone quantifier brackets")
			}
			if (J.maxBackReference > J.numCapturingParens) J.raise("Invalid escape");
			for (var Q = 0, Z = J.backReferenceNames; Q < Z.length; Q += 1) {
				var q = Z[Q];
				if (!J.groupNames[q]) J.raise("Invalid named capture referenced")
			}
		}, z.regexp_disjunction = function(J) {
			var Q = this.options.ecmaVersion >= 16;
			if (Q) J.branchID = new RJ(J.branchID, null);
			this.regexp_alternative(J);
			while (J.eat(124)) {
				if (Q) J.branchID = J.branchID.sibling();
				this.regexp_alternative(J)
			}
			if (Q) J.branchID = J.branchID.parent;
			if (this.regexp_eatQuantifier(J, !0)) J.raise("Nothing to repeat");
			if (J.eat(123)) J.raise("Lone quantifier brackets")
		}, z.regexp_alternative = function(J) {
			while (J.pos < J.source.length && this.regexp_eatTerm(J));
		}, z.regexp_eatTerm = function(J) {
			if (this.regexp_eatAssertion(J)) {
				if (J.lastAssertionIsQuantifiable && this.regexp_eatQuantifier(J)) {
					if (J.switchU) J.raise("Invalid quantifier")
				}
				return !0
			}
			if (J.switchU ? this.regexp_eatAtom(J) : this.regexp_eatExtendedAtom(J)) return this
				.regexp_eatQuantifier(J), !0;
			return !1
		}, z.regexp_eatAssertion = function(J) {
			var Q = J.pos;
			if (J.lastAssertionIsQuantifiable = !1, J.eat(94) || J.eat(36)) return !0;
			if (J.eat(92)) {
				if (J.eat(66) || J.eat(98)) return !0;
				J.pos = Q
			}
			if (J.eat(40) && J.eat(63)) {
				var Z = !1;
				if (this.options.ecmaVersion >= 9) Z = J.eat(60);
				if (J.eat(61) || J.eat(33)) {
					if (this.regexp_disjunction(J), !J.eat(41)) J.raise("Unterminated group");
					return J.lastAssertionIsQuantifiable = !Z, !0
				}
			}
			return J.pos = Q, !1
		}, z.regexp_eatQuantifier = function(J, Q) {
			if (Q === void 0) Q = !1;
			if (this.regexp_eatQuantifierPrefix(J, Q)) return J.eat(63), !0;
			return !1
		}, z.regexp_eatQuantifierPrefix = function(J, Q) {
			return J.eat(42) || J.eat(43) || J.eat(63) || this.regexp_eatBracedQuantifier(J, Q)
		}, z.regexp_eatBracedQuantifier = function(J, Q) {
			var Z = J.pos;
			if (J.eat(123)) {
				var q = 0,
					X = -1;
				if (this.regexp_eatDecimalDigits(J)) {
					if (q = J.lastIntValue, J.eat(44) && this.regexp_eatDecimalDigits(J)) X = J.lastIntValue;
					if (J.eat(125)) {
						if (X !== -1 && X < q && !Q) J.raise("numbers out of order in {} quantifier");
						return !0
					}
				}
				if (J.switchU && !Q) J.raise("Incomplete quantifier");
				J.pos = Z
			}
			return !1
		}, z.regexp_eatAtom = function(J) {
			return this.regexp_eatPatternCharacters(J) || J.eat(46) || this.regexp_eatReverseSolidusAtomEscape(
					J) || this.regexp_eatCharacterClass(J) || this.regexp_eatUncapturingGroup(J) || this
				.regexp_eatCapturingGroup(J)
		}, z.regexp_eatReverseSolidusAtomEscape = function(J) {
			var Q = J.pos;
			if (J.eat(92)) {
				if (this.regexp_eatAtomEscape(J)) return !0;
				J.pos = Q
			}
			return !1
		}, z.regexp_eatUncapturingGroup = function(J) {
			var Q = J.pos;
			if (J.eat(40)) {
				if (J.eat(63)) {
					if (this.options.ecmaVersion >= 16) {
						var Z = this.regexp_eatModifiers(J),
							q = J.eat(45);
						if (Z || q) {
							for (var X = 0; X < Z.length; X++) {
								var Y = Z.charAt(X);
								if (Z.indexOf(Y, X + 1) > -1) J.raise("Duplicate regular expression modifiers")
							}
							if (q) {
								var j = this.regexp_eatModifiers(J);
								if (!Z && !j && J.current() === 58) J.raise(
									"Invalid regular expression modifiers");
								for (var H = 0; H < j.length; H++) {
									var K = j.charAt(H);
									if (j.indexOf(K, H + 1) > -1 || Z.indexOf(K) > -1) J.raise(
										"Duplicate regular expression modifiers")
								}
							}
						}
					}
					if (J.eat(58)) {
						if (this.regexp_disjunction(J), J.eat(41)) return !0;
						J.raise("Unterminated group")
					}
				}
				J.pos = Q
			}
			return !1
		}, z.regexp_eatCapturingGroup = function(J) {
			if (J.eat(40)) {
				if (this.options.ecmaVersion >= 9) this.regexp_groupSpecifier(J);
				else if (J.current() === 63) J.raise("Invalid group");
				if (this.regexp_disjunction(J), J.eat(41)) return J.numCapturingParens += 1, !0;
				J.raise("Unterminated group")
			}
			return !1
		}, z.regexp_eatModifiers = function(J) {
			var Q = "",
				Z = 0;
			while ((Z = J.current()) !== -1 && cQ(Z)) Q += g(Z), J.advance();
			return Q
		};

		function cQ(J) {
			return J === 105 || J === 109 || J === 115
		}
		z.regexp_eatExtendedAtom = function(J) {
			return J.eat(46) || this.regexp_eatReverseSolidusAtomEscape(J) || this.regexp_eatCharacterClass(
				J) || this.regexp_eatUncapturingGroup(J) || this.regexp_eatCapturingGroup(J) || this
				.regexp_eatInvalidBracedQuantifier(J) || this.regexp_eatExtendedPatternCharacter(J)
		}, z.regexp_eatInvalidBracedQuantifier = function(J) {
			if (this.regexp_eatBracedQuantifier(J, !0)) J.raise("Nothing to repeat");
			return !1
		}, z.regexp_eatSyntaxCharacter = function(J) {
			var Q = J.current();
			if (YQ(Q)) return J.lastIntValue = Q, J.advance(), !0;
			return !1
		};

		function YQ(J) {
			return J === 36 || J >= 40 && J <= 43 || J === 46 || J === 63 || J >= 91 && J <= 94 || J >= 123 && J <=
				125
		}
		z.regexp_eatPatternCharacters = function(J) {
			var Q = J.pos,
				Z = 0;
			while ((Z = J.current()) !== -1 && !YQ(Z)) J.advance();
			return J.pos !== Q
		}, z.regexp_eatExtendedPatternCharacter = function(J) {
			var Q = J.current();
			if (Q !== -1 && Q !== 36 && !(Q >= 40 && Q <= 43) && Q !== 46 && Q !== 63 && Q !== 91 && Q !== 94 &&
				Q !== 124) return J.advance(), !0;
			return !1
		}, z.regexp_groupSpecifier = function(J) {
			if (J.eat(63)) {
				if (!this.regexp_eatGroupName(J)) J.raise("Invalid group");
				var Q = this.options.ecmaVersion >= 16,
					Z = J.groupNames[J.lastStringValue];
				if (Z)
					if (Q)
						for (var q = 0, X = Z; q < X.length; q += 1) {
							var Y = X[q];
							if (!Y.separatedFrom(J.branchID)) J.raise("Duplicate capture group name")
						} else J.raise("Duplicate capture group name");
				if (Q)(Z || (J.groupNames[J.lastStringValue] = [])).push(J.branchID);
				else J.groupNames[J.lastStringValue] = !0
			}
		}, z.regexp_eatGroupName = function(J) {
			if (J.lastStringValue = "", J.eat(60)) {
				if (this.regexp_eatRegExpIdentifierName(J) && J.eat(62)) return !0;
				J.raise("Invalid capture group name")
			}
			return !1
		}, z.regexp_eatRegExpIdentifierName = function(J) {
			if (J.lastStringValue = "", this.regexp_eatRegExpIdentifierStart(J)) {
				J.lastStringValue += g(J.lastIntValue);
				while (this.regexp_eatRegExpIdentifierPart(J)) J.lastStringValue += g(J.lastIntValue);
				return !0
			}
			return !1
		}, z.regexp_eatRegExpIdentifierStart = function(J) {
			var Q = J.pos,
				Z = this.options.ecmaVersion >= 11,
				q = J.current(Z);
			if (J.advance(Z), q === 92 && this.regexp_eatRegExpUnicodeEscapeSequence(J, Z)) q = J.lastIntValue;
			if (dQ(q)) return J.lastIntValue = q, !0;
			return J.pos = Q, !1
		};

		function dQ(J) {
			return T(J, !0) || J === 36 || J === 95
		}
		z.regexp_eatRegExpIdentifierPart = function(J) {
			var Q = J.pos,
				Z = this.options.ecmaVersion >= 11,
				q = J.current(Z);
			if (J.advance(Z), q === 92 && this.regexp_eatRegExpUnicodeEscapeSequence(J, Z)) q = J.lastIntValue;
			if (iQ(q)) return J.lastIntValue = q, !0;
			return J.pos = Q, !1
		};

		function iQ(J) {
			return x(J, !0) || J === 36 || J === 95 || J === 8204 || J === 8205
		}
		z.regexp_eatAtomEscape = function(J) {
			if (this.regexp_eatBackReference(J) || this.regexp_eatCharacterClassEscape(J) || this
				.regexp_eatCharacterEscape(J) || J.switchN && this.regexp_eatKGroupName(J)) return !0;
			if (J.switchU) {
				if (J.current() === 99) J.raise("Invalid unicode escape");
				J.raise("Invalid escape")
			}
			return !1
		}, z.regexp_eatBackReference = function(J) {
			var Q = J.pos;
			if (this.regexp_eatDecimalEscape(J)) {
				var Z = J.lastIntValue;
				if (J.switchU) {
					if (Z > J.maxBackReference) J.maxBackReference = Z;
					return !0
				}
				if (Z <= J.numCapturingParens) return !0;
				J.pos = Q
			}
			return !1
		}, z.regexp_eatKGroupName = function(J) {
			if (J.eat(107)) {
				if (this.regexp_eatGroupName(J)) return J.backReferenceNames.push(J.lastStringValue), !0;
				J.raise("Invalid named reference")
			}
			return !1
		}, z.regexp_eatCharacterEscape = function(J) {
			return this.regexp_eatControlEscape(J) || this.regexp_eatCControlLetter(J) || this.regexp_eatZero(
				J) || this.regexp_eatHexEscapeSequence(J) || this.regexp_eatRegExpUnicodeEscapeSequence(J, !
				1) || !J.switchU && this.regexp_eatLegacyOctalEscapeSequence(J) || this
				.regexp_eatIdentityEscape(J)
		}, z.regexp_eatCControlLetter = function(J) {
			var Q = J.pos;
			if (J.eat(99)) {
				if (this.regexp_eatControlLetter(J)) return !0;
				J.pos = Q
			}
			return !1
		}, z.regexp_eatZero = function(J) {
			if (J.current() === 48 && !FJ(J.lookahead())) return J.lastIntValue = 0, J.advance(), !0;
			return !1
		}, z.regexp_eatControlEscape = function(J) {
			var Q = J.current();
			if (Q === 116) return J.lastIntValue = 9, J.advance(), !0;
			if (Q === 110) return J.lastIntValue = 10, J.advance(), !0;
			if (Q === 118) return J.lastIntValue = 11, J.advance(), !0;
			if (Q === 102) return J.lastIntValue = 12, J.advance(), !0;
			if (Q === 114) return J.lastIntValue = 13, J.advance(), !0;
			return !1
		}, z.regexp_eatControlLetter = function(J) {
			var Q = J.current();
			if (jQ(Q)) return J.lastIntValue = Q % 32, J.advance(), !0;
			return !1
		};

		function jQ(J) {
			return J >= 65 && J <= 90 || J >= 97 && J <= 122
		}
		z.regexp_eatRegExpUnicodeEscapeSequence = function(J, Q) {
			if (Q === void 0) Q = !1;
			var Z = J.pos,
				q = Q || J.switchU;
			if (J.eat(117)) {
				if (this.regexp_eatFixedHexDigits(J, 4)) {
					var X = J.lastIntValue;
					if (q && X >= 55296 && X <= 56319) {
						var Y = J.pos;
						if (J.eat(92) && J.eat(117) && this.regexp_eatFixedHexDigits(J, 4)) {
							var j = J.lastIntValue;
							if (j >= 56320 && j <= 57343) return J.lastIntValue = (X - 55296) * 1024 + (j -
								56320) + 65536, !0
						}
						J.pos = Y, J.lastIntValue = X
					}
					return !0
				}
				if (q && J.eat(123) && this.regexp_eatHexDigits(J) && J.eat(125) && nQ(J.lastIntValue)) return !
					0;
				if (q) J.raise("Invalid unicode escape");
				J.pos = Z
			}
			return !1
		};

		function nQ(J) {
			return J >= 0 && J <= 1114111
		}
		z.regexp_eatIdentityEscape = function(J) {
			if (J.switchU) {
				if (this.regexp_eatSyntaxCharacter(J)) return !0;
				if (J.eat(47)) return J.lastIntValue = 47, !0;
				return !1
			}
			var Q = J.current();
			if (Q !== 99 && (!J.switchN || Q !== 107)) return J.lastIntValue = Q, J.advance(), !0;
			return !1
		}, z.regexp_eatDecimalEscape = function(J) {
			J.lastIntValue = 0;
			var Q = J.current();
			if (Q >= 49 && Q <= 57) {
				do J.lastIntValue = 10 * J.lastIntValue + (Q - 48), J.advance(); while ((Q = J.current()) >=
					48 && Q <= 57);
				return !0
			}
			return !1
		};
		var HQ = 0,
			h = 1,
			k = 2;
		z.regexp_eatCharacterClassEscape = function(J) {
			var Q = J.current();
			if (aQ(Q)) return J.lastIntValue = -1, J.advance(), h;
			var Z = !1;
			if (J.switchU && this.options.ecmaVersion >= 9 && ((Z = Q === 80) || Q === 112)) {
				J.lastIntValue = -1, J.advance();
				var q;
				if (J.eat(123) && (q = this.regexp_eatUnicodePropertyValueExpression(J)) && J.eat(125)) {
					if (Z && q === k) J.raise("Invalid property name");
					return q
				}
				J.raise("Invalid property name")
			}
			return HQ
		};

		function aQ(J) {
			return J === 100 || J === 68 || J === 115 || J === 83 || J === 119 || J === 87
		}
		z.regexp_eatUnicodePropertyValueExpression = function(J) {
			var Q = J.pos;
			if (this.regexp_eatUnicodePropertyName(J) && J.eat(61)) {
				var Z = J.lastStringValue;
				if (this.regexp_eatUnicodePropertyValue(J)) {
					var q = J.lastStringValue;
					return this.regexp_validateUnicodePropertyNameAndValue(J, Z, q), h
				}
			}
			if (J.pos = Q, this.regexp_eatLoneUnicodePropertyNameOrValue(J)) {
				var X = J.lastStringValue;
				return this.regexp_validateUnicodePropertyNameOrValue(J, X)
			}
			return HQ
		}, z.regexp_validateUnicodePropertyNameAndValue = function(J, Q, Z) {
			if (!c(J.unicodeProperties.nonBinary, Q)) J.raise("Invalid property name");
			if (!J.unicodeProperties.nonBinary[Q].test(Z)) J.raise("Invalid property value")
		}, z.regexp_validateUnicodePropertyNameOrValue = function(J, Q) {
			if (J.unicodeProperties.binary.test(Q)) return h;
			if (J.switchV && J.unicodeProperties.binaryOfStrings.test(Q)) return k;
			J.raise("Invalid property name")
		}, z.regexp_eatUnicodePropertyName = function(J) {
			var Q = 0;
			J.lastStringValue = "";
			while (KQ(Q = J.current())) J.lastStringValue += g(Q), J.advance();
			return J.lastStringValue !== ""
		};

		function KQ(J) {
			return jQ(J) || J === 95
		}
		z.regexp_eatUnicodePropertyValue = function(J) {
			var Q = 0;
			J.lastStringValue = "";
			while (oQ(Q = J.current())) J.lastStringValue += g(Q), J.advance();
			return J.lastStringValue !== ""
		};

		function oQ(J) {
			return KQ(J) || FJ(J)
		}
		z.regexp_eatLoneUnicodePropertyNameOrValue = function(J) {
			return this.regexp_eatUnicodePropertyValue(J)
		}, z.regexp_eatCharacterClass = function(J) {
			if (J.eat(91)) {
				var Q = J.eat(94),
					Z = this.regexp_classContents(J);
				if (!J.eat(93)) J.raise("Unterminated character class");
				if (Q && Z === k) J.raise("Negated character class may contain strings");
				return !0
			}
			return !1
		}, z.regexp_classContents = function(J) {
			if (J.current() === 93) return h;
			if (J.switchV) return this.regexp_classSetExpression(J);
			return this.regexp_nonEmptyClassRanges(J), h
		}, z.regexp_nonEmptyClassRanges = function(J) {
			while (this.regexp_eatClassAtom(J)) {
				var Q = J.lastIntValue;
				if (J.eat(45) && this.regexp_eatClassAtom(J)) {
					var Z = J.lastIntValue;
					if (J.switchU && (Q === -1 || Z === -1)) J.raise("Invalid character class");
					if (Q !== -1 && Z !== -1 && Q > Z) J.raise("Range out of order in character class")
				}
			}
		}, z.regexp_eatClassAtom = function(J) {
			var Q = J.pos;
			if (J.eat(92)) {
				if (this.regexp_eatClassEscape(J)) return !0;
				if (J.switchU) {
					var Z = J.current();
					if (Z === 99 || RQ(Z)) J.raise("Invalid class escape");
					J.raise("Invalid escape")
				}
				J.pos = Q
			}
			var q = J.current();
			if (q !== 93) return J.lastIntValue = q, J.advance(), !0;
			return !1
		}, z.regexp_eatClassEscape = function(J) {
			var Q = J.pos;
			if (J.eat(98)) return J.lastIntValue = 8, !0;
			if (J.switchU && J.eat(45)) return J.lastIntValue = 45, !0;
			if (!J.switchU && J.eat(99)) {
				if (this.regexp_eatClassControlLetter(J)) return !0;
				J.pos = Q
			}
			return this.regexp_eatCharacterClassEscape(J) || this.regexp_eatCharacterEscape(J)
		}, z.regexp_classSetExpression = function(J) {
			var Q = h,
				Z;
			if (this.regexp_eatClassSetRange(J));
			else if (Z = this.regexp_eatClassSetOperand(J)) {
				if (Z === k) Q = k;
				var q = J.pos;
				while (J.eatChars([38, 38])) {
					if (J.current() !== 38 && (Z = this.regexp_eatClassSetOperand(J))) {
						if (Z !== k) Q = h;
						continue
					}
					J.raise("Invalid character in character class")
				}
				if (q !== J.pos) return Q;
				while (J.eatChars([45, 45])) {
					if (this.regexp_eatClassSetOperand(J)) continue;
					J.raise("Invalid character in character class")
				}
				if (q !== J.pos) return Q
			} else J.raise("Invalid character in character class");
			for (;;) {
				if (this.regexp_eatClassSetRange(J)) continue;
				if (Z = this.regexp_eatClassSetOperand(J), !Z) return Q;
				if (Z === k) Q = k
			}
		}, z.regexp_eatClassSetRange = function(J) {
			var Q = J.pos;
			if (this.regexp_eatClassSetCharacter(J)) {
				var Z = J.lastIntValue;
				if (J.eat(45) && this.regexp_eatClassSetCharacter(J)) {
					var q = J.lastIntValue;
					if (Z !== -1 && q !== -1 && Z > q) J.raise("Range out of order in character class");
					return !0
				}
				J.pos = Q
			}
			return !1
		}, z.regexp_eatClassSetOperand = function(J) {
			if (this.regexp_eatClassSetCharacter(J)) return h;
			return this.regexp_eatClassStringDisjunction(J) || this.regexp_eatNestedClass(J)
		}, z.regexp_eatNestedClass = function(J) {
			var Q = J.pos;
			if (J.eat(91)) {
				var Z = J.eat(94),
					q = this.regexp_classContents(J);
				if (J.eat(93)) {
					if (Z && q === k) J.raise("Negated character class may contain strings");
					return q
				}
				J.pos = Q
			}
			if (J.eat(92)) {
				var X = this.regexp_eatCharacterClassEscape(J);
				if (X) return X;
				J.pos = Q
			}
			return null
		}, z.regexp_eatClassStringDisjunction = function(J) {
			var Q = J.pos;
			if (J.eatChars([92, 113])) {
				if (J.eat(123)) {
					var Z = this.regexp_classStringDisjunctionContents(J);
					if (J.eat(125)) return Z
				} else J.raise("Invalid escape");
				J.pos = Q
			}
			return null
		}, z.regexp_classStringDisjunctionContents = function(J) {
			var Q = this.regexp_classString(J);
			while (J.eat(124))
				if (this.regexp_classString(J) === k) Q = k;
			return Q
		}, z.regexp_classString = function(J) {
			var Q = 0;
			while (this.regexp_eatClassSetCharacter(J)) Q++;
			return Q === 1 ? h : k
		}, z.regexp_eatClassSetCharacter = function(J) {
			var Q = J.pos;
			if (J.eat(92)) {
				if (this.regexp_eatCharacterEscape(J) || this.regexp_eatClassSetReservedPunctuator(J)) return !
				0;
				if (J.eat(98)) return J.lastIntValue = 8, !0;
				return J.pos = Q, !1
			}
			var Z = J.current();
			if (Z < 0 || Z === J.lookahead() && rQ(Z)) return !1;
			if (sQ(Z)) return !1;
			return J.advance(), J.lastIntValue = Z, !0
		};

		function rQ(J) {
			return J === 33 || J >= 35 && J <= 38 || J >= 42 && J <= 44 || J === 46 || J >= 58 && J <= 64 || J ===
				94 || J === 96 || J === 126
		}

		function sQ(J) {
			return J === 40 || J === 41 || J === 45 || J === 47 || J >= 91 && J <= 93 || J >= 123 && J <= 125
		}
		z.regexp_eatClassSetReservedPunctuator = function(J) {
			var Q = J.current();
			if (tQ(Q)) return J.lastIntValue = Q, J.advance(), !0;
			return !1
		};

		function tQ(J) {
			return J === 33 || J === 35 || J === 37 || J === 38 || J === 44 || J === 45 || J >= 58 && J <= 62 ||
				J === 64 || J === 96 || J === 126
		}
		z.regexp_eatClassControlLetter = function(J) {
			var Q = J.current();
			if (FJ(Q) || Q === 95) return J.lastIntValue = Q % 32, J.advance(), !0;
			return !1
		}, z.regexp_eatHexEscapeSequence = function(J) {
			var Q = J.pos;
			if (J.eat(120)) {
				if (this.regexp_eatFixedHexDigits(J, 2)) return !0;
				if (J.switchU) J.raise("Invalid escape");
				J.pos = Q
			}
			return !1
		}, z.regexp_eatDecimalDigits = function(J) {
			var Q = J.pos,
				Z = 0;
			J.lastIntValue = 0;
			while (FJ(Z = J.current())) J.lastIntValue = 10 * J.lastIntValue + (Z - 48), J.advance();
			return J.pos !== Q
		};

		function FJ(J) {
			return J >= 48 && J <= 57
		}
		z.regexp_eatHexDigits = function(J) {
			var Q = J.pos,
				Z = 0;
			J.lastIntValue = 0;
			while (zQ(Z = J.current())) J.lastIntValue = 16 * J.lastIntValue + GQ(Z), J.advance();
			return J.pos !== Q
		};

		function zQ(J) {
			return J >= 48 && J <= 57 || J >= 65 && J <= 70 || J >= 97 && J <= 102
		}

		function GQ(J) {
			if (J >= 65 && J <= 70) return 10 + (J - 65);
			if (J >= 97 && J <= 102) return 10 + (J - 97);
			return J - 48
		}
		z.regexp_eatLegacyOctalEscapeSequence = function(J) {
			if (this.regexp_eatOctalDigit(J)) {
				var Q = J.lastIntValue;
				if (this.regexp_eatOctalDigit(J)) {
					var Z = J.lastIntValue;
					if (Q <= 3 && this.regexp_eatOctalDigit(J)) J.lastIntValue = Q * 64 + Z * 8 + J
					.lastIntValue;
					else J.lastIntValue = Q * 8 + Z
				} else J.lastIntValue = Q;
				return !0
			}
			return !1
		}, z.regexp_eatOctalDigit = function(J) {
			var Q = J.current();
			if (RQ(Q)) return J.lastIntValue = Q - 48, J.advance(), !0;
			return J.lastIntValue = 0, !1
		};

		function RQ(J) {
			return J >= 48 && J <= 55
		}
		z.regexp_eatFixedHexDigits = function(J, Q) {
			var Z = J.pos;
			J.lastIntValue = 0;
			for (var q = 0; q < Q; ++q) {
				var X = J.current();
				if (!zQ(X)) return J.pos = Z, !1;
				J.lastIntValue = 16 * J.lastIntValue + GQ(X), J.advance()
			}
			return !0
		};
		var MJ = function J(Q) {
				if (this.type = Q.type, this.value = Q.value, this.start = Q.start, this.end = Q.end, Q.options
					.locations) this.loc = new s(Q, Q.startLoc, Q.endLoc);
				if (Q.options.ranges) this.range = [Q.start, Q.end]
			},
			V = $.prototype;
		if (V.next = function(J) {
				if (!J && this.type.keyword && this.containsEsc) this.raiseRecoverable(this.start,
					"Escape sequence in keyword " + this.type.keyword);
				if (this.options.onToken) this.options.onToken(new MJ(this));
				this.lastTokEnd = this.end, this.lastTokStart = this.start, this.lastTokEndLoc = this.endLoc, this
					.lastTokStartLoc = this.startLoc, this.nextToken()
			}, V.getToken = function() {
				return this.next(), new MJ(this)
			}, typeof Symbol !== "undefined") V[Symbol.iterator] = function() {
			var J = this;
			return {
				next: function() {
					var Q = J.getToken();
					return {
						done: Q.type === W.eof,
						value: Q
					}
				}
			}
		};
		V.nextToken = function() {
			var J = this.curContext();
			if (!J || !J.preserveSpace) this.skipSpace();
			if (this.start = this.pos, this.options.locations) this.startLoc = this.curPosition();
			if (this.pos >= this.input.length) return this.finishToken(W.eof);
			if (J.override) return J.override(this);
			else this.readToken(this.fullCharCodeAtPos())
		}, V.readToken = function(J) {
			if (T(J, this.options.ecmaVersion >= 6) || J === 92) return this.readWord();
			return this.getTokenFromCode(J)
		}, V.fullCharCodeAtPos = function() {
			var J = this.input.charCodeAt(this.pos);
			if (J <= 55295 || J >= 56320) return J;
			var Q = this.input.charCodeAt(this.pos + 1);
			return Q <= 56319 || Q >= 57344 ? J : (J << 10) + Q - 56613888
		}, V.skipBlockComment = function() {
			var J = this.options.onComment && this.curPosition(),
				Q = this.pos,
				Z = this.input.indexOf("*/", this.pos += 2);
			if (Z === -1) this.raise(this.pos - 2, "Unterminated comment");
			if (this.pos = Z + 2, this.options.locations)
				for (var q = void 0, X = Q;
					(q = DJ(this.input, X, this.pos)) > -1;) ++this.curLine, X = this.lineStart = q;
			if (this.options.onComment) this.options.onComment(!0, this.input.slice(Q + 2, Z), Q, this.pos, J,
				this.curPosition())
		}, V.skipLineComment = function(J) {
			var Q = this.pos,
				Z = this.options.onComment && this.curPosition(),
				q = this.input.charCodeAt(this.pos += J);
			while (this.pos < this.input.length && !l(q)) q = this.input.charCodeAt(++this.pos);
			if (this.options.onComment) this.options.onComment(!1, this.input.slice(Q + J, this.pos), Q, this
				.pos, Z, this.curPosition())
		}, V.skipSpace = function() {
			J: while (this.pos < this.input.length) {
				var J = this.input.charCodeAt(this.pos);
				switch (J) {
					case 32:
					case 160:
						++this.pos;
						break;
					case 13:
						if (this.input.charCodeAt(this.pos + 1) === 10) ++this.pos;
					case 10:
					case 8232:
					case 8233:
						if (++this.pos, this.options.locations) ++this.curLine, this.lineStart = this.pos;
						break;
					case 47:
						switch (this.input.charCodeAt(this.pos + 1)) {
							case 42:
								this.skipBlockComment();
								break;
							case 47:
								this.skipLineComment(2);
								break;
							default:
								break J
						}
						break;
					default:
						if (J > 8 && J < 14 || J >= 5760 && NJ.test(String.fromCharCode(J))) ++this.pos;
						else break J
				}
			}
		}, V.finishToken = function(J, Q) {
			if (this.end = this.pos, this.options.locations) this.endLoc = this.curPosition();
			var Z = this.type;
			this.type = J, this.value = Q, this.updateContext(Z)
		}, V.readToken_dot = function() {
			var J = this.input.charCodeAt(this.pos + 1);
			if (J >= 48 && J <= 57) return this.readNumber(!0);
			var Q = this.input.charCodeAt(this.pos + 2);
			if (this.options.ecmaVersion >= 6 && J === 46 && Q === 46) return this.pos += 3, this.finishToken(W
				.ellipsis);
			else return ++this.pos, this.finishToken(W.dot)
		}, V.readToken_slash = function() {
			var J = this.input.charCodeAt(this.pos + 1);
			if (this.exprAllowed) return ++this.pos, this.readRegexp();
			if (J === 61) return this.finishOp(W.assign, 2);
			return this.finishOp(W.slash, 1)
		}, V.readToken_mult_modulo_exp = function(J) {
			var Q = this.input.charCodeAt(this.pos + 1),
				Z = 1,
				q = J === 42 ? W.star : W.modulo;
			if (this.options.ecmaVersion >= 7 && J === 42 && Q === 42) ++Z, q = W.starstar, Q = this.input
				.charCodeAt(this.pos + 2);
			if (Q === 61) return this.finishOp(W.assign, Z + 1);
			return this.finishOp(q, Z)
		}, V.readToken_pipe_amp = function(J) {
			var Q = this.input.charCodeAt(this.pos + 1);
			if (Q === J) {
				if (this.options.ecmaVersion >= 12) {
					var Z = this.input.charCodeAt(this.pos + 2);
					if (Z === 61) return this.finishOp(W.assign, 3)
				}
				return this.finishOp(J === 124 ? W.logicalOR : W.logicalAND, 2)
			}
			if (Q === 61) return this.finishOp(W.assign, 2);
			return this.finishOp(J === 124 ? W.bitwiseOR : W.bitwiseAND, 1)
		}, V.readToken_caret = function() {
			var J = this.input.charCodeAt(this.pos + 1);
			if (J === 61) return this.finishOp(W.assign, 2);
			return this.finishOp(W.bitwiseXOR, 1)
		}, V.readToken_plus_min = function(J) {
			var Q = this.input.charCodeAt(this.pos + 1);
			if (Q === J) {
				if (Q === 45 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 62 && (this
						.lastTokEnd === 0 || b.test(this.input.slice(this.lastTokEnd, this.pos)))) return this
					.skipLineComment(3), this.skipSpace(), this.nextToken();
				return this.finishOp(W.incDec, 2)
			}
			if (Q === 61) return this.finishOp(W.assign, 2);
			return this.finishOp(W.plusMin, 1)
		}, V.readToken_lt_gt = function(J) {
			var Q = this.input.charCodeAt(this.pos + 1),
				Z = 1;
			if (Q === J) {
				if (Z = J === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2, this.input.charCodeAt(
						this.pos + Z) === 61) return this.finishOp(W.assign, Z + 1);
				return this.finishOp(W.bitShift, Z)
			}
			if (Q === 33 && J === 60 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 45 && this
				.input.charCodeAt(this.pos + 3) === 45) return this.skipLineComment(4), this.skipSpace(), this
				.nextToken();
			if (Q === 61) Z = 2;
			return this.finishOp(W.relational, Z)
		}, V.readToken_eq_excl = function(J) {
			var Q = this.input.charCodeAt(this.pos + 1);
			if (Q === 61) return this.finishOp(W.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2);
			if (J === 61 && Q === 62 && this.options.ecmaVersion >= 6) return this.pos += 2, this.finishToken(W
				.arrow);
			return this.finishOp(J === 61 ? W.eq : W.prefix, 1)
		}, V.readToken_question = function() {
			var J = this.options.ecmaVersion;
			if (J >= 11) {
				var Q = this.input.charCodeAt(this.pos + 1);
				if (Q === 46) {
					var Z = this.input.charCodeAt(this.pos + 2);
					if (Z < 48 || Z > 57) return this.finishOp(W.questionDot, 2)
				}
				if (Q === 63) {
					if (J >= 12) {
						var q = this.input.charCodeAt(this.pos + 2);
						if (q === 61) return this.finishOp(W.assign, 3)
					}
					return this.finishOp(W.coalesce, 2)
				}
			}
			return this.finishOp(W.question, 1)
		}, V.readToken_numberSign = function() {
			var J = this.options.ecmaVersion,
				Q = 35;
			if (J >= 13) {
				if (++this.pos, Q = this.fullCharCodeAtPos(), T(Q, !0) || Q === 92) return this.finishToken(W
					.privateId, this.readWord1())
			}
			this.raise(this.pos, "Unexpected character '" + g(Q) + "'")
		}, V.getTokenFromCode = function(J) {
			switch (J) {
				case 46:
					return this.readToken_dot();
				case 40:
					return ++this.pos, this.finishToken(W.parenL);
				case 41:
					return ++this.pos, this.finishToken(W.parenR);
				case 59:
					return ++this.pos, this.finishToken(W.semi);
				case 44:
					return ++this.pos, this.finishToken(W.comma);
				case 91:
					return ++this.pos, this.finishToken(W.bracketL);
				case 93:
					return ++this.pos, this.finishToken(W.bracketR);
				case 123:
					return ++this.pos, this.finishToken(W.braceL);
				case 125:
					return ++this.pos, this.finishToken(W.braceR);
				case 58:
					return ++this.pos, this.finishToken(W.colon);
				case 96:
					if (this.options.ecmaVersion < 6) break;
					return ++this.pos, this.finishToken(W.backQuote);
				case 48:
					var Q = this.input.charCodeAt(this.pos + 1);
					if (Q === 120 || Q === 88) return this.readRadixNumber(16);
					if (this.options.ecmaVersion >= 6) {
						if (Q === 111 || Q === 79) return this.readRadixNumber(8);
						if (Q === 98 || Q === 66) return this.readRadixNumber(2)
					}
				case 49:
				case 50:
				case 51:
				case 52:
				case 53:
				case 54:
				case 55:
				case 56:
				case 57:
					return this.readNumber(!1);
				case 34:
				case 39:
					return this.readString(J);
				case 47:
					return this.readToken_slash();
				case 37:
				case 42:
					return this.readToken_mult_modulo_exp(J);
				case 124:
				case 38:
					return this.readToken_pipe_amp(J);
				case 94:
					return this.readToken_caret();
				case 43:
				case 45:
					return this.readToken_plus_min(J);
				case 60:
				case 62:
					return this.readToken_lt_gt(J);
				case 61:
				case 33:
					return this.readToken_eq_excl(J);
				case 63:
					return this.readToken_question();
				case 126:
					return this.finishOp(W.prefix, 1);
				case 35:
					return this.readToken_numberSign()
			}
			this.raise(this.pos, "Unexpected character '" + g(J) + "'")
		}, V.finishOp = function(J, Q) {
			var Z = this.input.slice(this.pos, this.pos + Q);
			return this.pos += Q, this.finishToken(J, Z)
		}, V.readRegexp = function() {
			var J, Q, Z = this.pos;
			for (;;) {
				if (this.pos >= this.input.length) this.raise(Z, "Unterminated regular expression");
				var q = this.input.charAt(this.pos);
				if (b.test(q)) this.raise(Z, "Unterminated regular expression");
				if (!J) {
					if (q === "[") Q = !0;
					else if (q === "]" && Q) Q = !1;
					else if (q === "/" && !Q) break;
					J = q === "\\"
				} else J = !1;
				++this.pos
			}
			var X = this.input.slice(Z, this.pos);
			++this.pos;
			var Y = this.pos,
				j = this.readWord1();
			if (this.containsEsc) this.unexpected(Y);
			var H = this.regexpState || (this.regexpState = new y(this));
			H.reset(Z, X, j), this.validateRegExpFlags(H), this.validateRegExpPattern(H);
			var K = null;
			try {
				K = new RegExp(X, j)
			} catch (R) {}
			return this.finishToken(W.regexp, {
				pattern: X,
				flags: j,
				value: K
			})
		}, V.readInt = function(J, Q, Z) {
			var q = this.options.ecmaVersion >= 12 && Q === void 0,
				X = Z && this.input.charCodeAt(this.pos) === 48,
				Y = this.pos,
				j = 0,
				H = 0;
			for (var K = 0, R = Q == null ? 1 / 0 : Q; K < R; ++K, ++this.pos) {
				var M = this.input.charCodeAt(this.pos),
					N = void 0;
				if (q && M === 95) {
					if (X) this.raiseRecoverable(this.pos,
						"Numeric separator is not allowed in legacy octal numeric literals");
					if (H === 95) this.raiseRecoverable(this.pos,
						"Numeric separator must be exactly one underscore");
					if (K === 0) this.raiseRecoverable(this.pos,
						"Numeric separator is not allowed at the first of digits");
					H = M;
					continue
				}
				if (M >= 97) N = M - 97 + 10;
				else if (M >= 65) N = M - 65 + 10;
				else if (M >= 48 && M <= 57) N = M - 48;
				else N = 1 / 0;
				if (N >= J) break;
				H = M, j = j * J + N
			}
			if (q && H === 95) this.raiseRecoverable(this.pos - 1,
				"Numeric separator is not allowed at the last of digits");
			if (this.pos === Y || Q != null && this.pos - Y !== Q) return null;
			return j
		};

		function eQ(J, Q) {
			if (Q) return parseInt(J, 8);
			return parseFloat(J.replace(/_/g, ""))
		}

		function FQ(J) {
			if (typeof BigInt !== "function") return null;
			return BigInt(J.replace(/_/g, ""))
		}
		V.readRadixNumber = function(J) {
			var Q = this.pos;
			this.pos += 2;
			var Z = this.readInt(J);
			if (Z == null) this.raise(this.start + 2, "Expected number in radix " + J);
			if (this.options.ecmaVersion >= 11 && this.input.charCodeAt(this.pos) === 110) Z = FQ(this.input
				.slice(Q, this.pos)), ++this.pos;
			else if (T(this.fullCharCodeAtPos())) this.raise(this.pos, "Identifier directly after number");
			return this.finishToken(W.num, Z)
		}, V.readNumber = function(J) {
			var Q = this.pos;
			if (!J && this.readInt(10, void 0, !0) === null) this.raise(Q, "Invalid number");
			var Z = this.pos - Q >= 2 && this.input.charCodeAt(Q) === 48;
			if (Z && this.strict) this.raise(Q, "Invalid number");
			var q = this.input.charCodeAt(this.pos);
			if (!Z && !J && this.options.ecmaVersion >= 11 && q === 110) {
				var X = FQ(this.input.slice(Q, this.pos));
				if (++this.pos, T(this.fullCharCodeAtPos())) this.raise(this.pos,
					"Identifier directly after number");
				return this.finishToken(W.num, X)
			}
			if (Z && /[89]/.test(this.input.slice(Q, this.pos))) Z = !1;
			if (q === 46 && !Z) ++this.pos, this.readInt(10), q = this.input.charCodeAt(this.pos);
			if ((q === 69 || q === 101) && !Z) {
				if (q = this.input.charCodeAt(++this.pos), q === 43 || q === 45) ++this.pos;
				if (this.readInt(10) === null) this.raise(Q, "Invalid number")
			}
			if (T(this.fullCharCodeAtPos())) this.raise(this.pos, "Identifier directly after number");
			var Y = eQ(this.input.slice(Q, this.pos), Z);
			return this.finishToken(W.num, Y)
		}, V.readCodePoint = function() {
			var J = this.input.charCodeAt(this.pos),
				Q;
			if (J === 123) {
				if (this.options.ecmaVersion < 6) this.unexpected();
				var Z = ++this.pos;
				if (Q = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos), ++this.pos, Q > 1114111)
					this.invalidStringToken(Z, "Code point out of bounds")
			} else Q = this.readHexChar(4);
			return Q
		}, V.readString = function(J) {
			var Q = "",
				Z = ++this.pos;
			for (;;) {
				if (this.pos >= this.input.length) this.raise(this.start, "Unterminated string constant");
				var q = this.input.charCodeAt(this.pos);
				if (q === J) break;
				if (q === 92) Q += this.input.slice(Z, this.pos), Q += this.readEscapedChar(!1), Z = this.pos;
				else if (q === 8232 || q === 8233) {
					if (this.options.ecmaVersion < 10) this.raise(this.start, "Unterminated string constant");
					if (++this.pos, this.options.locations) this.curLine++, this.lineStart = this.pos
				} else {
					if (l(q)) this.raise(this.start, "Unterminated string constant");
					++this.pos
				}
			}
			return Q += this.input.slice(Z, this.pos++), this.finishToken(W.string, Q)
		};
		var MQ = {};
		V.tryReadTemplateToken = function() {
			this.inTemplateElement = !0;
			try {
				this.readTmplToken()
			} catch (J) {
				if (J === MQ) this.readInvalidTemplateToken();
				else throw J
			}
			this.inTemplateElement = !1
		}, V.invalidStringToken = function(J, Q) {
			if (this.inTemplateElement && this.options.ecmaVersion >= 9) throw MQ;
			else this.raise(J, Q)
		}, V.readTmplToken = function() {
			var J = "",
				Q = this.pos;
			for (;;) {
				if (this.pos >= this.input.length) this.raise(this.start, "Unterminated template");
				var Z = this.input.charCodeAt(this.pos);
				if (Z === 96 || Z === 36 && this.input.charCodeAt(this.pos + 1) === 123) {
					if (this.pos === this.start && (this.type === W.template || this.type === W
						.invalidTemplate))
						if (Z === 36) return this.pos += 2, this.finishToken(W.dollarBraceL);
						else return ++this.pos, this.finishToken(W.backQuote);
					return J += this.input.slice(Q, this.pos), this.finishToken(W.template, J)
				}
				if (Z === 92) J += this.input.slice(Q, this.pos), J += this.readEscapedChar(!0), Q = this.pos;
				else if (l(Z)) {
					switch (J += this.input.slice(Q, this.pos), ++this.pos, Z) {
						case 13:
							if (this.input.charCodeAt(this.pos) === 10) ++this.pos;
						case 10:
							J += `
`;
							break;
						default:
							J += String.fromCharCode(Z);
							break
					}
					if (this.options.locations) ++this.curLine, this.lineStart = this.pos;
					Q = this.pos
				} else ++this.pos
			}
		}, V.readInvalidTemplateToken = function() {
			for (; this.pos < this.input.length; this.pos++) switch (this.input[this.pos]) {
				case "\\":
					++this.pos;
					break;
				case "$":
					if (this.input[this.pos + 1] !== "{") break;
				case "`":
					return this.finishToken(W.invalidTemplate, this.input.slice(this.start, this.pos));
				case "\r":
					if (this.input[this.pos + 1] === `
`) ++this.pos;
				case `
`:
				case "\u2028":
				case "\u2029":
					++this.curLine, this.lineStart = this.pos + 1;
					break
			}
			this.raise(this.start, "Unterminated template")
		}, V.readEscapedChar = function(J) {
			var Q = this.input.charCodeAt(++this.pos);
			switch (++this.pos, Q) {
				case 110:
					return `
`;
				case 114:
					return "\r";
				case 120:
					return String.fromCharCode(this.readHexChar(2));
				case 117:
					return g(this.readCodePoint());
				case 116:
					return "\t";
				case 98:
					return "\b";
				case 118:
					return "\v";
				case 102:
					return "\f";
				case 13:
					if (this.input.charCodeAt(this.pos) === 10) ++this.pos;
				case 10:
					if (this.options.locations) this.lineStart = this.pos, ++this.curLine;
					return "";
				case 56:
				case 57:
					if (this.strict) this.invalidStringToken(this.pos - 1, "Invalid escape sequence");
					if (J) {
						var Z = this.pos - 1;
						this.invalidStringToken(Z, "Invalid escape sequence in template string")
					}
				default:
					if (Q >= 48 && Q <= 55) {
						var q = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0],
							X = parseInt(q, 8);
						if (X > 255) q = q.slice(0, -1), X = parseInt(q, 8);
						if (this.pos += q.length - 1, Q = this.input.charCodeAt(this.pos), (q !== "0" || Q ===
								56 || Q === 57) && (this.strict || J)) this.invalidStringToken(this.pos - 1 - q
							.length, J ? "Octal literal in template string" : "Octal literal in strict mode"
							);
						return String.fromCharCode(X)
					}
					if (l(Q)) {
						if (this.options.locations) this.lineStart = this.pos, ++this.curLine;
						return ""
					}
					return String.fromCharCode(Q)
			}
		}, V.readHexChar = function(J) {
			var Q = this.pos,
				Z = this.readInt(16, J);
			if (Z === null) this.invalidStringToken(Q, "Bad character escape sequence");
			return Z
		}, V.readWord1 = function() {
			this.containsEsc = !1;
			var J = "",
				Q = !0,
				Z = this.pos,
				q = this.options.ecmaVersion >= 6;
			while (this.pos < this.input.length) {
				var X = this.fullCharCodeAtPos();
				if (x(X, q)) this.pos += X <= 65535 ? 1 : 2;
				else if (X === 92) {
					this.containsEsc = !0, J += this.input.slice(Z, this.pos);
					var Y = this.pos;
					if (this.input.charCodeAt(++this.pos) !== 117) this.invalidStringToken(this.pos,
						"Expecting Unicode escape sequence \\uXXXX");
					++this.pos;
					var j = this.readCodePoint();
					if (!(Q ? T : x)(j, q)) this.invalidStringToken(Y, "Invalid Unicode escape");
					J += g(j), Z = this.pos
				} else break;
				Q = !1
			}
			return J + this.input.slice(Z, this.pos)
		}, V.readWord = function() {
			var J = this.readWord1(),
				Q = W.name;
			if (this.keywords.test(J)) Q = WJ[J];
			return this.finishToken(Q, J)
		};
		var VQ = "8.15.0";
		$.acorn = {
			Parser: $,
			version: VQ,
			defaultOptions: XJ,
			Position: d,
			SourceLocation: s,
			getLineInfo: $J,
			Node: QJ,
			TokenType: _,
			tokTypes: W,
			keywordTypes: WJ,
			TokContext: P,
			tokContexts: U,
			isIdentifierChar: x,
			isIdentifierStart: T,
			Token: MJ,
			isNewLine: l,
			lineBreak: b,
			lineBreakG: TJ,
			nonASCIIwhitespace: NJ
		};

		function JZ(J, Q) {
			return $.parse(J, Q)
		}

		function QZ(J, Q, Z) {
			return $.parseExpressionAt(J, Q, Z)
		}

		function ZZ(J, Q) {
			return $.tokenizer(J, Q)
		}
		B.Node = QJ, B.Parser = $, B.Position = d, B.SourceLocation = s, B.TokContext = P, B.Token = MJ, B
			.TokenType = _, B.defaultOptions = XJ, B.getLineInfo = $J, B.isIdentifierChar = x, B.isIdentifierStart =
			T, B.isNewLine = l, B.keywordTypes = WJ, B.lineBreak = b, B.lineBreakG = TJ, B.nonASCIIwhitespace = NJ,
			B.parse = JZ, B.parseExpressionAt = QZ, B.tokContexts = U, B.tokTypes = W, B.tokenizer = ZZ, B.version =
			VQ
	})
});
var WZ = _Q(),
	jZ = WZ;
export {
	jZ as
	default
};