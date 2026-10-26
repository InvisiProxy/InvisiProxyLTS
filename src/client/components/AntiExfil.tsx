import { Disguise, values } from '../document-helpers.tsx';

const hidden = {
	position: 'absolute',
	width: '1px',
	height: '1px',
	margin: '-1px',
	overflow: 'hidden',
	clip: 'rect(0 0 0 0)',
} as const;

export default function AntiExfil() {
	const { formId, fields } = values.honeypot;
	return (
		<Disguise>
			<form id={formId} style={hidden} aria-hidden="true">
				{fields.map((field) => (
					<>
						<label for={field.id}>{field.label}</label>
						<input
							type={field.type}
							autocomplete={field.autocomplete}
							id={field.id}
							name={field.name}
							placeholder={field.placeholder}
							tabindex={-1}
						/>
					</>
				))}
			</form>
		</Disguise>
	);
}
