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
						{`${translate('scramjetError.network')} | Scramjet `}
						<span id="scramjetVersion"></span>
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
				innerHTML={`
					html {
						height: 100%;
					}

					body {
						display: flex;
						align-items: center;
						flex-direction: column;
						gap: 1em;
						min-height: 100%;
						overflow-y: auto;
						color: #eceff4;
						background-color: #0d1117;
						background-image:
							radial-gradient(circle, rgba(131, 131, 131, 0.02) 1px, transparent 1px),
							radial-gradient(circle, rgba(148, 148, 148, 0.02) 1px, transparent 1px);
						background-position: 0 0, 5px 5px;
						background-size: 10px 10px;
						font-family: 'Figtree', sans-serif;
						font-optical-sizing: auto;
					}

					h1 {
						color: #ff5861;
						font-size: clamp(22px, 6vw, 64px);
						font-weight: 900;
						margin-top: clamp(3%, 6%, 6%);
					}

					code,
					i {
						color: #e5e9f0;
						background: none;
						font-size: clamp(14px, 2.5vw, 24px);
						font-weight: 500;
					}

					i {
						font-size: clamp(13px, 2vw, 20px);
						font-weight: 900;
						font-style: normal;
					}

					#fetchedURL {
						word-break: break-all;
					}

					a {
						color: #ff5861;
					}

					.footer-spacing {
						margin-top: 0.5%;
						font-size: clamp(0.8em, 1.5vw, 1em);
					}

					button {
						display: inline-block;
						padding: clamp(8px, 1.5vw, 15px) clamp(18px, 4vw, 50px);
						border-radius: 8px;
						margin: 20px 10px 10px;
						font-size: clamp(0.85em, 1.5vw, 1em);
						color: #eceff4;
						background-color: #0d1117;
						transition: 0.3s ease-in-out;
						border: 1px solid rgba(255, 255, 255, 0.2);
						box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
					}

					button:hover {
						background-color: #434c5e;
					}

					textarea {
						width: 100%;
						box-sizing: border-box;
						padding: clamp(12px, 2vw, 25px);
						border-radius: 18px;
						border: 1px solid rgba(255, 255, 255, 0.12);
						outline: none;
						resize: none;
						color: #d8dee9;
						background-color: #06080c;
						box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
						font-size: clamp(0.85em, 1.5vw, 1em);
					}

					.nf-fa-heart {
						color: #ff5861;
					}

					#inner {
						display: flex;
						align-items: center;
						flex-direction: column;
						gap: 1em;
						width: min(900px, 94vw);
						padding: 0 clamp(8px, 2vw, 24px);
						box-sizing: border-box;
						z-index: 100;
					}

					#cover {
						position: absolute;
						width: 100%;
						height: 100%;
						background-color: color-mix(in srgb, var(--deep) 70%, transparent);
						z-index: 99;
					}

					#info {
						display: flex;
						align-items: flex-start;
						gap: 1.5em;
						width: 100%;
					}

					#info > div {
						margin: 0;
						padding: 0;
					}

					#errorTrace-wrapper {
						position: relative;
						flex: 0 1 450px;
						min-width: 0;
					}

					#copy-button {
						position: absolute;
						top: 0.5em;
						right: 0.5em;
						margin: 0;
						padding: 0.23em 0.6em;
						cursor: pointer;
						opacity: 0;
						transition: opacity 0.4s;
						font-size: 0.9em;
					}

					#errorTrace-wrapper:hover #copy-button {
						opacity: 1;
					}

					#troubleshooting {
						flex: 1 1 0;
						min-width: 0;
						text-align: left;
					}

					#troubleshooting ul {
						margin-left: 1.2em;
						padding-left: 0.8em;
						list-style-position: outside;
					}

					#troubleshooting li {
						margin-bottom: 0.5em;
					}

					@media (max-width: 700px) {
						#info {
							flex-direction: column;
							align-items: stretch;
						}

						#errorTrace-wrapper {
							flex: none;
						}
					}
				`}
			/>
		</>
	);
}
