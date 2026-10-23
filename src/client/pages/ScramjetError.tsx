import {
	Keywords,
	route,
	translate,
	Translation,
} from '../document-helpers.tsx';
import HeadContent from '../components/HeadContent.tsx';
import AntiExfil from '../components/AntiExfil.tsx';

export default function ScramjetError() {
	return (
		<>
			<Keywords />
			<AntiExfil />
			<div id="cover"></div>
			<div id="inner" class="container-fluid text-center">
				<h1 id="errorTitle">{translate('scramjetError.title')}</h1>
				<code>
					{`${translate('scramjetError.failed')} `}
					<b id="fetchedURL"></b>
				</code>
				<h2>{translate('scramjetError.reload')}</h2>
				<br />
				<button type="button" id="reload">
					{translate('scramjetError.refresh')}
				</button>
				<br />
				<div id="info">
					<div id="errorTrace-wrapper" class="container">
						<textarea
							id="errorTrace"
							cols="40"
							rows="10"
							readonly={true}
						></textarea>
						<button type="button" id="copy-button" class="primary">
							{translate('scramjetError.copy')}
						</button>
					</div>
					<div id="troubleshooting" class="container text-wrap">
						<p>{translate('scramjetError.try')}</p>
						<ul>
							<li>{translate('scramjetError.tips.reload')}</li>
							<li>{translate('scramjetError.tips.idb')}</li>
							<li>{translate('scramjetError.tips.cache')}</li>
							<li>{translate('scramjetError.tips.address')}</li>
							<li>
								{translate('scramjetError.tips.maintenance')}
							</li>
							<li>{translate('scramjetError.tips.address')}</li>
							<li>{translate('scramjetError.tips.censored')}</li>
							<li>{translate('scramjetError.tips.faq')}</li>
							<li>
								<Translation
									id="scramjetError.tips.github"
									tags={{
										github: (text) => (
											<a
												href={route('/github/scramjet')}
												target="_blank"
												rel="noopener noreferrer"
											>
												{text}
											</a>
										),
									}}
								/>
							</li>
							<li>{translate('scramjetError.tips.engine')}</li>
						</ul>
					</div>
				</div>
				<code>
					<i>
						{`${translate('scramjetError.network')} | Scramjet v1.1.0 - build 57ba89e.`}
					</i>
				</code>
				<p class="footer-spacing">
					<i>
						{`InvisiProxy LTS © 2020-2026 | ${translate('scramjetError.love')} `}
					</i>
					<i class="nf nf-fa-heart"></i>
				</p>
			</div>
			<script id="proxy-error-script" src="about:blank" innerHTML="" />
		</>
	);
}

export function Head() {
	return (
		<>
			<title>Scramjet</title>
			<meta itemprop="http-status" content="404" />
			<HeadContent />
			<link
				rel="stylesheet"
				href="https://www.nerdfonts.com/assets/css/webfont.css"
			/>
			<link
				href={
					'https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap'
				}
				rel="stylesheet"
			/>
			<link
				href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta1/dist/css/bootstrap.min.css"
				rel="stylesheet"
			/>
			<style
				innerHTML={
					"\n      *,\n      body {\n        color: #eceff4;\n        background-color: #0d1117;\n        font-family: 'Figtree', sans-serif;\n        font-optical-sizing: auto;\n        background-image:\n          radial-gradient(circle, rgba(131, 131, 131, 0.02) 1px, transparent 1px),\n          radial-gradient(circle, rgba(148, 148, 148, 0.02) 1px, transparent 1px);\n        background-position: 0 0, 5px 5px;\n        background-size: 10px 10px;\n      }\n\n      #password-field {\n        display: none;\n      }\n\n      h1 {\n        color: #ff5861;\n        font-size: clamp(22px, 6vw, 64px);\n        font-weight: 900;\n        margin-top: clamp(3%, 6%, 6%);\n      }\n\n      code,\n      i {\n        color: #e5e9f0;\n        font-size: clamp(14px, 2.5vw, 24px);\n        font-weight: 500;\n      }\n\n      i {\n        color: #e5e9f0;\n        font-size: clamp(13px, 2vw, 20px);\n        font-weight: 900;\n        text-decoration: none;\n        font-style: normal;\n      }\n\n      .footer-spacing {\n        margin-top: 0.5%;\n        font-size: clamp(0.8em, 1.5vw, 1em);\n      }\n\n      button {\n        display: inline-block;\n        text-decoration: none;\n        padding: clamp(8px, 1.5vw, 15px) clamp(18px, 4vw, 50px);\n        border-radius: 8px;\n        margin: 10px;\n        margin-top: 20px;\n        font-size: clamp(0.85em, 1.5vw, 1em);\n        transition: 0.3s ease-in-out;\n        -webkit-transition: 0.3s ease-in-out;\n        border: 1px solid rgba(255, 255, 255, 0.2);\n        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);\n        -webkit-backdrop-filter: blur(10px);\n        backdrop-filter: blur(10px);\n      }\n\n      button:hover {\n        background-color: #434c5e;\n      }\n\n      textarea {\n        border-radius: 18px;\n        outline: none;\n        resize: none;\n        border: 1px solid rgba(255, 255, 255, 0.2);\n        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);\n        padding: clamp(12px, 2vw, 25px);\n        box-sizing: border-box;\n        width: min(450px, 92vw);\n        font-size: clamp(0.85em, 1.5vw, 1em);\n      }\n\n      .nf-fa-heart {\n        color: #ff5861;\n      }\n\n      html {\n        height: 100%;\n      }\n\n      body {\n        display: flex;\n        align-items: center;\n        flex-direction: column;\n        gap: 1em;\n        min-height: 100%;\n        overflow-y: auto;\n      }\n\n      #inner {\n        display: flex;\n        align-items: center;\n        flex-direction: column;\n        gap: 1em;\n        width: min(900px, 94vw);\n        padding: 0 clamp(8px, 2vw, 24px);\n        box-sizing: border-box;\n        z-index: 100;\n      }\n      \n      #cover {\n        position: absolute;\n        width: 100%;\n        height: 100%;\n        background-color: color-mix(in srgb, var(--deep) 70%, transparent);\n        z-index: 99;\n      }\n\n      #info {\n        display: flex;\n        flex-direction: row;\n        align-items: flex-start;\n        gap: 1em;\n        flex-wrap: wrap;\n        width: 100%;\n      }\n\n      #errorTrace-wrapper {\n        position: relative;\n        width: fit-content;\n        max-width: 100%;\n      }\n\n      #copy-button {\n        position: absolute;\n        top: 0.5em;\n        right: 0.5em;\n        padding: 0.23em;\n        cursor: pointer;\n        opacity: 0;\n        transition: opacity 0.4s;\n        font-size: 0.9em;\n      }\n\n      #errorTrace-wrapper:hover #copy-button {\n        opacity: 1;\n      }\n\n      #troubleshooting,\n      .text-wrap {\n        text-align: left;\n        width: 100%;\n        max-width: 100%;\n      }\n\n      #troubleshooting ul {\n        margin-left: 1.2em;\n        padding-left: 0.8em;\n        list-style-position: outside;\n      }\n\n      #troubleshooting li {\n        text-align: left;\n        margin-bottom: 0.5em;\n      }\n\n      @media (max-width: 600px) {\n        #info {\n          flex-direction: column;\n          align-items: stretch;\n        }\n      }\n    "
				}
			/>
		</>
	);
}
