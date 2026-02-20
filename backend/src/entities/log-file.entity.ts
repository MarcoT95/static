import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('log_files')
export class LogFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fileName: string;

  @Column({ unique: true })
  filePath: string;

  @Column({ default: 'app' })
  level: 'app' | 'error';

  @Column({ type: 'bigint', default: 0 })
  sizeBytes: number;

  @Column({ type: 'timestamp' })
  lastModifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
